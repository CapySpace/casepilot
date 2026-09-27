import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolves the `@/*` alias from tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    // The spec's second seam is pure functions — input in, value out. There are deliberately no
    // component tests, so no DOM environment is needed.
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
