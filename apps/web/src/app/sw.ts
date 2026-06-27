import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Манифест прекэша, который @serwist/next инжектит в сборку.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Хэшированные ассеты сборки иммутабельны — кэшируем надолго.
    {
      matcher: /\/_next\/static\/.*/i,
      handler: new CacheFirst({
        cacheName: "next-static",
        plugins: [new ExpirationPlugin({ maxEntries: 256, maxAgeSeconds: 60 * 60 * 24 * 365 })],
      }),
    },
    // Картинки/шрифты/стили — отдаём из кэша, обновляя в фоне.
    {
      matcher: ({ request }) =>
        request.destination === "image" ||
        request.destination === "font" ||
        request.destination === "style",
      handler: new StaleWhileRevalidate({
        cacheName: "static-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 30 })],
      }),
    },
    // Навигации, RSC-пейлоады, данные персонажа, Server Actions — ТОЛЬКО сеть.
    // Не отдаём устаревшие игровые значения из кэша (см. MOBILE-APP.md, «принцип данных»,
    // и CLAUDE.md, золотое правило 1). Офлайн → fallback-страница ниже.
    {
      matcher: () => true,
      handler: new NetworkOnly(),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.mode === "navigate";
        },
      },
    ],
  },
});

serwist.addEventListeners();
