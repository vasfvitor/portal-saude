// @ts-check
// TypeScript with type-aware rules, plus Astro. Formatting belongs to Prettier: eslint-config-prettier
// comes last and switches the style rules off. Same rule set as anvisa-hub.
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import astro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist/", ".astro/", "node_modules/", "public/", ".claude/", ".idea/", ".vscode/"] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // safety
      eqeqeq: ["error", "smart"],
      "no-param-reassign": "error",
      "no-implicit-coercion": ["error", { allow: ["!!"] }],
      "@typescript-eslint/switch-exhaustiveness-check": ["error", { considerDefaultExhaustiveForUnions: true }],
      "@typescript-eslint/return-await": ["error", "in-try-catch"],
      // `||` on strings is deliberate: an empty environment variable falls back to the default
      "@typescript-eslint/prefer-nullish-coalescing": ["error", { ignorePrimitives: { string: true } }],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      // readability
      curly: ["error", "multi-line"],
      "no-else-return": "error",
      "no-lonely-if": "error",
      "object-shorthand": "error",
      "prefer-arrow-callback": "error",
      "prefer-const": "error",
      "prefer-template": "error",
      "no-var": "error",
    },
  },
  {
    files: ["src/**"],
    rules: { "no-console": "error" },
  },
  astro.configs.recommended,
  // .astro files and their inline scripts (virtual .astro/*.js files) stay outside the TS program
  {
    files: ["**/*.astro", "**/*.astro/*.js", "**/*.astro/*.ts"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.browser },
  },
  // configs run in Node, outside the tsconfig
  {
    files: ["**/*.mjs", "*.config.js", "*.config.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
