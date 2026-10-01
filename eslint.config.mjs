import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/api-types.ts",
      ".venv/**",
      "workbook-handoff/**",
      "design/canvas/**", // the founder's canvas, kept verbatim; its viewer is not product code
      "docs/**",
      ".scratch/**",
      "specs/**/prototype/**", // clickable design prototypes, not product code
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["{web,ops}/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    files: ["desktop/**/*.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  { files: ["*.mjs"], languageOptions: { globals: globals.node } },
);
