import { baseConfig } from "@gob/config/eslint";
import tseslint from "typescript-eslint";

export default tseslint.config(
  ...baseConfig(),
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  { ignores: ["dist/"] },
);
