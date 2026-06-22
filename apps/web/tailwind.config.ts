import type { Config } from "tailwindcss";
import { baseConfig } from "@gob/config/tailwind";

const config: Config = {
  ...baseConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
