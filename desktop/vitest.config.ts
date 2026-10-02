import { defineConfig } from "vitest/config";

// specs/step-w/SPEC-W2.md, point 48: desktop's vitest also runs the tests the tests lane writes
// in ../tests/desktop, outside the lane it tests. A run that matches no file passes.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "../tests/desktop/**/*.test.ts"],
    passWithNoTests: true,
    coverage: { provider: "v8", reporter: ["text-summary", "lcov"], include: ["src/**"] },
  },
});
