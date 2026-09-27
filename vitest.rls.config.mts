import { defineConfig } from "vitest/config";
import { config as loadEnv } from "dotenv";

/**
 * The third seam: the database, reached the way an attacker would.
 *
 * These tests talk to Supabase over the **publishable key** as real signed-in Users, so what they
 * assert is what PostgREST returns — not what a page renders. That is the only honest way to meet
 * "direct API access cannot bypass membership restrictions": a browser test that types someone
 * else's Project URL exercises the proxy and the Data Access Layer and says nothing about
 * row-level security.
 *
 * Separate from `vitest.config.mts` because that suite is pure functions and runs anywhere, while
 * this one needs a running stack (`supabase start`).
 */
loadEnv({ path: ".env.local", quiet: true });

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/rls/**/*.test.ts"],
    // Every test seeds its own Users and Projects, so files may run together. Each acting User is a
    // real registration at the provider, which is slower than a pure function by some margin.
    testTimeout: 30_000,
  },
});
