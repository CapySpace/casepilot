import { expect, test } from "@playwright/test";

import { createBuild } from "../support/builds";
import { signedInUser } from "../support/clients";
import { signInAndLand } from "../support/flows";
import { createProject } from "../support/projects";
import { createRelease } from "../support/releases";
import { completeTestAttempt, createTestAttempt, createTestResult } from "../support/test-attempts";
import { createTestCase } from "../support/test-cases";

/**
 * The Attempt Report: overall progress, the Outcome breakdown, every individual Result, the tester,
 * and timestamps — reachable and correct whatever the Attempt's own Status.
 *
 * Starting, recording and completing an Attempt through the interface are the other two files' own
 * coverage; every test here arranges its Attempt and Results directly, the way the application's own
 * writes eventually will, and only exercises the Report itself.
 */

test("the Report of a Completed Attempt shows its progress, breakdown, Results, tester and timestamps", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  const passing = await createTestCase(anna, build, "Sign in with valid credentials");
  const failing = await createTestCase(anna, build, "Sign out clears the session");
  const attempt = await createTestAttempt(anna, build);
  const passingResult = await createTestResult(anna, attempt, passing, "Sign in with valid credentials");
  await createTestResult(anna, attempt, failing, "Sign out clears the session");
  await anna.client
    .from("test_results")
    .update({
      outcome: "Passed",
      notes: "Landed on the dashboard as expected.",
      executed_by: anna.id,
      executed_at: new Date().toISOString(),
    })
    .eq("id", passingResult);
  await completeTestAttempt(anna, attempt);
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}/attempts/${attempt}`);

  await expect(page.getByRole("heading", { name: "Attempt #1" })).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await expect(page.getByText(`Started by ${anna.fullName}`)).toBeVisible();
  await expect(page.getByText("Tested: 1 / 2")).toBeVisible();
  await expect(page.getByText("Passed: 1")).toBeVisible();
  await expect(page.getByText("Not Run: 1")).toBeVisible();
  await expect(page.getByText("Sign in with valid credentials")).toBeVisible();
  await expect(page.getByText("Landed on the dashboard as expected.")).toBeVisible();
  await expect(page.getByText(`Recorded by ${anna.fullName}`)).toBeVisible();
  await expect(page.getByText("Sign out clears the session")).toBeVisible();
  await expect(page.getByText("No notes recorded.")).toBeVisible();
});

test("the Report of an in-progress Attempt is also read-only, and links onward to keep working it", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  const testCase = await createTestCase(anna, build, "Sign in with valid credentials");
  const attempt = await createTestAttempt(anna, build);
  await createTestResult(anna, attempt, testCase, "Sign in with valid credentials");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}/attempts/${attempt}`);

  await expect(page.getByText("In Progress")).toBeVisible();
  await expect(page.getByText("Tested: 0 / 1")).toBeVisible();
  await expect(page.getByRole("button", { name: "Passed", exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page).toHaveURL(
    `/projects/${project}/releases/${release}/builds/${build}/attempts/${attempt}/execute`,
  );
});

test("a non-member cannot reach an Attempt's Report", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await createProject(anna, "Anna's Secret Project");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  const testCase = await createTestCase(anna, build);
  const attempt = await createTestAttempt(anna, build);
  await createTestResult(anna, attempt, testCase);
  await signInAndLand(page, peter);

  const response = await page.goto(
    `/projects/${project}/releases/${release}/builds/${build}/attempts/${attempt}`,
  );
  expect(response?.status()).toBe(404);
});
