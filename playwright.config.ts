import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

/**
 * The browser is the primary seam. These tests drive the real application against the real local
 * Supabase stack — the provider is never mocked, because a mock would cheerfully confirm behaviour
 * the real provider does not have.
 *
 * Run `supabase start` first. See the README's "Running the tests".
 */

// Next.js loads .env.local for the app under test; the test process needs it too, for the
// administrative calls that seed verified Users.
loadEnv({ path: ".env.local", quiet: true });

const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // A test that only passes on a retry is a flaky test, and this suite is where flakiness would
  // hide. Fail instead, so it gets fixed.
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // One browser. Nothing in CasePilot's authentication is browser-specific, and a suite that takes
  // three times as long gets run a third as often.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
