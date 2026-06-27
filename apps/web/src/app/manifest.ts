import type { MetadataRoute } from "next";

// Web App Manifest. App Router отдаёт его как /manifest.webmanifest, а
// <link rel="manifest"> Next добавляет автоматически — ручная строка в layout не нужна.
// theme_color синхронизирован с viewport.themeColor в layout.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Game of Braza",
    short_name: "Braza",
    description: "Цифровая анкета персонажа для настольной RPG-системы",
    lang: "ru",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    categories: ["games"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
