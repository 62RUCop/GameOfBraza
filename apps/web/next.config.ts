import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Самодостаточный сервер для Docker-деплоя: .next/standalone с минимальным
  // набором трейснутых зависимостей (см. apps/web/Dockerfile).
  output: "standalone",
  // В монорепо трейсинг файлов должен идти от корня workspace, иначе standalone
  // не подхватит зависимости из packages/* и hoisted node_modules.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@gob/ui", "@gob/rules", "@gob/db"],
};

export default nextConfig;
