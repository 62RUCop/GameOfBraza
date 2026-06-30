import type { NextConfig } from "next";
import path from "node:path";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // Самодостаточный сервер для Docker-деплоя: .next/standalone с минимальным
  // набором трейснутых зависимостей (см. apps/web/Dockerfile).
  output: "standalone",
  // В монорепо трейсинг файлов должен идти от корня workspace, иначе standalone
  // не подхватит зависимости из packages/* и hoisted node_modules.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@gob/ui", "@gob/rules", "@gob/db", "@gob/core"],
};

// PWA service worker (Serwist). Оборачиваем конфиг, не затирая standalone-трейсинг.
// Сгенерированный public/sw.js попадает в standalone-сборку через file tracing public/.
// В dev SW отключён, чтобы не мешать HMR и не кэшировать на лету.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
