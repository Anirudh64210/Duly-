import { defineConfig } from "vitest/config";

// specs/step-w/SPEC-W2.md, point 48: desktop's vitest also runs the tests the tests lane writes
// in ../tests/desktop, outside the lane it tests. A run that matches no file passes.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "../tests/desktop/**/*.test.ts"],
    passWithNoTests: true,
    // The documents tests encrypt and decrypt real files in 1 MiB chunks and relaunch the store
    // (SPEC-W2 points 14 to 17). On GitHub's runner with coverage on, one took 5.3 s against
    // vitest's 5 s default (run 37192766341), while the whole file took 37 s. A limit, not an
    // assertion: a test that hangs still fails.
    testTimeout: 30_000,
    coverage: { provider: "v8", reporter: ["text-summary", "lcov"], include: ["src/**"] },
  },
});
