import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** @param {boolean} [isNext] */
export function baseConfig(isNext = false) {
  return tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
      rules: {
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/consistent-type-imports": [
          "error",
          { prefer: "type-imports" },
        ],
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
      },
    },
    isNext
      ? {
          rules: {
            "@typescript-eslint/require-await": "off",
          },
        }
      : {},
  );
}
