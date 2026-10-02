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
      "desktop/build/**", // the bundled Python runtime (step-w W1)
      "desktop/out/**", // the packaged app (step-w W1)
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
  {
    // The tests lane's web tests (specs/step-w/SPEC-W2.md, point 48), run by web's vitest.
    files: ["tests/web/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    // The tests lane's desktop tests (specs/step-w/SPEC-W2.md, point 48), run by desktop's vitest.
    files: ["tests/desktop/**/*.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  { files: ["*.mjs"], languageOptions: { globals: globals.node } },
  {
    // A CommonJS package that appdmg requires (the image-size shim).
    files: ["tools/npm/**/*.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
