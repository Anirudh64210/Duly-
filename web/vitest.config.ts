import { configDefaults, defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

// specs/step-w/SPEC-W2.md, point 48: web's vitest also runs the tests the tests lane writes in
// ../tests/web, outside the lane it tests. Everything else comes from vite.config.ts (the
// plugins, jsdom, the css include and coverage). A run that matches no file passes.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: [...configDefaults.include, "../tests/web/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
      passWithNoTests: true,
    },
  }),
);
