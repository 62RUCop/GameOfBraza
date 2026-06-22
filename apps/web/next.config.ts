import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@gob/ui", "@gob/rules", "@gob/db"],
};

export default nextConfig;
