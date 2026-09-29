import { expect, test, type Page } from "@playwright/test";

import { createBuild } from "../support/builds";
import { signedInUser } from "../support/clients";
import { signInAndLand } from "../support/flows";
import { createProject } from "../support/projects";
import { createRelease } from "../support/releases";
import { createTestAttempt, createTestResult } from "../support/test-attempts";
import { createTestCase } from "../support/test-cases";

/**
 * The Build Report's summary, Outcome breakdown and completion/pass-rate — computed live from a
 * Build's `Ready` Cases and every Attempt taken against it. Starting, recording and completing an
 * Attempt through the interface are `tests/e2e/testing-attempts.spec.ts` and
 * `tests/e2e/attempt-execution.spec.ts`'s own coverage; every test here arranges its Cases, Attempt
 * and Results directly and only exercises the Report itself.
 */

/** A summary card's value, scoped by its exact label — avoids "Tested" also matching "Not Tested". */
function statValue(page: Page, label: string) {
  return page.locator("dt", { hasText: new RegExp(`^${label}$`) }).locator("xpath=following-sibling::dd[1]");
}

/** Marks a Case Ready — every Case is created Draft, and only Ready Cases count toward the Report. */
async function markReady(anna: Awaited<ReturnType<typeof signedInUser>>, testCaseId: string) {
  const { error } = await anna.client.from("test_cases").update({ status: "Ready" }).eq("id", testCaseId);
  if (error) throw new Error(`Could not mark Case ${testCaseId} Ready: ${error.message}`);
}

/** Marks a Case Deprecated — for arranging "tested, then Deprecated afterward" as a precondition. */
async function markDeprecated(anna: Awaited<ReturnType<typeof signedInUser>>, testCaseId: string) {
  const { error } = await anna.client.from("test_cases").update({ status: "Deprecated" }).eq("id", testCaseId);
  if (error) throw new Error(`Could not mark Case ${testCaseId} Deprecated: ${error.message}`);
}

test("the Report shows summary numbers, completion and pass rate matching its Ready Cases and Results", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");

  const passingCase = await createTestCase(anna, build, "Sign in with valid credentials");
  const failingCase = await createTestCase(anna, build, "Sign out clears the session");
  const blockedCase = await createTestCase(anna, build, "Reset password by email");
  const untouchedCase = await createTestCase(anna, build, "Change account email");
  // Never marked Ready — must not count toward the totals at all.
  const draftCase = await createTestCase(anna, build, "A case still being written");
  await markReady(anna, passingCase);
  await markReady(anna, failingCase);
  await markReady(anna, blockedCase);
  await markReady(anna, untouchedCase);

  // Left In Progress deliberately: a Case reached by a still-open Attempt must already count.
  const attempt = await createTestAttempt(anna, build);
  const passingResult = await createTestResult(anna, attempt, passingCase, "Sign in with valid credentials");
  const failingResult = await createTestResult(anna, attempt, failingCase, "Sign out clears the session");
  const blockedResult = await createTestResult(anna, attempt, blockedCase, "Reset password by email");
  await createTestResult(anna, attempt, draftCase, "A case still being written");
  await anna.client.from("test_results").update({ outcome: "Passed" }).eq("id", passingResult);
  await anna.client.from("test_results").update({ outcome: "Failed" }).eq("id", failingResult);
  await anna.client.from("test_results").update({ outcome: "Blocked" }).eq("id", blockedResult);
  // `untouchedCase` gets no Attempt at all — reported as Not Tested, not Not Run.

  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}/releases/${release}/builds/${build}/report`);

  await expect(page.getByRole("heading", { name: "Report" })).toBeVisible();

  await expect(statValue(page, "Total Test Cases")).toHaveText("4");
  await expect(statValue(page, "Tested")).toHaveText("3");
  await expect(statValue(page, "Passed")).toHaveText("1");
  await expect(statValue(page, "Failed")).toHaveText("1");
  await expect(statValue(page, "Blocked")).toHaveText("1");
  await expect(statValue(page, "Skipped")).toHaveText("0");
  await expect(statValue(page, "Not Tested")).toHaveText("1");
  await expect(statValue(page, "Completion")).toHaveText("75.0%");
  await expect(statValue(page, "Pass Rate")).toHaveText("33.3%");

  await expect(page.getByText("Completion: 75.0%")).toBeVisible();
  await expect(page.getByText("Tested: 3 / 4")).toBeVisible();
  // The six-way breakdown bar distinguishes Not Run (0 — no Case was left untouched by a reaching
  // Attempt) from Not Tested (1 — `untouchedCase`, no Attempt ever reached it).
  await expect(page.getByText("Not Run: 0", { exact: true })).toBeVisible();
  await expect(page.getByText("Not Tested: 1", { exact: true })).toBeVisible();
});

test("the Failure Overview lists Failed and Blocked Cases, filters correctly, still shows a Deprecated Case's old failure, and leaves the summary cards unchanged", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");

  const passingCase = await createTestCase(anna, build, "Sign in with valid credentials");
  const failingCase = await createTestCase(anna, build, "Sign out clears the session");
  const blockedCase = await createTestCase(anna, build, "Reset password by email");
  const deprecatedCase = await createTestCase(anna, build, "An old failure nobody fixed");
  await markReady(anna, passingCase);
  await markReady(anna, failingCase);
  await markReady(anna, blockedCase);
  await markReady(anna, deprecatedCase);

  const attempt = await createTestAttempt(anna, build);
  const passingResult = await createTestResult(anna, attempt, passingCase, "Sign in with valid credentials");
  const failingResult = await createTestResult(anna, attempt, failingCase, "Sign out clears the session");
  const blockedResult = await createTestResult(anna, attempt, blockedCase, "Reset password by email");
  const deprecatedResult = await createTestResult(anna, attempt, deprecatedCase, "An old failure nobody fixed");
  await anna.client.from("test_results").update({ outcome: "Passed" }).eq("id", passingResult);
  await anna.client.from("test_results").update({ outcome: "Failed" }).eq("id", failingResult);
  await anna.client.from("test_results").update({ outcome: "Blocked" }).eq("id", blockedResult);
  await anna.client.from("test_results").update({ outcome: "Failed" }).eq("id", deprecatedResult);
  // Deprecated *after* being tested — must still show in the Failure Overview, but drop out of the
  // summary cards' totals.
  await markDeprecated(anna, deprecatedCase);

  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}/releases/${release}/builds/${build}/report`);

  // Summary: only the 3 still-Ready Cases count. All 3 tested, all real verdicts.
  await expect(statValue(page, "Total Test Cases")).toHaveText("3");
  await expect(statValue(page, "Tested")).toHaveText("3");
  await expect(statValue(page, "Not Tested")).toHaveText("0");

  await expect(page.getByRole("heading", { name: "Failure Overview" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign out clears the session" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reset password by email" })).toBeVisible();
  await expect(page.getByRole("link", { name: "An old failure nobody fixed" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in with valid credentials" })).toHaveCount(0);

  await page.getByLabel("Filter by Outcome").selectOption("Failed");
  await expect(page.getByRole("link", { name: "Sign out clears the session" })).toBeVisible();
  await expect(page.getByRole("link", { name: "An old failure nobody fixed" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reset password by email" })).toHaveCount(0);

  await page.getByLabel("Filter by Outcome").selectOption("Blocked");
  await expect(page.getByRole("link", { name: "Reset password by email" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign out clears the session" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "An old failure nobody fixed" })).toHaveCount(0);

  // Filtering the Failure Overview must never touch the summary cards above it.
  await expect(statValue(page, "Total Test Cases")).toHaveText("3");
  await expect(statValue(page, "Tested")).toHaveText("3");
});

test("a Build with only Passed Cases shows an honest empty Failure Overview", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  const passingCase = await createTestCase(anna, build, "Sign in with valid credentials");
  await markReady(anna, passingCase);
  const attempt = await createTestAttempt(anna, build);
  const passingResult = await createTestResult(anna, attempt, passingCase, "Sign in with valid credentials");
  await anna.client.from("test_results").update({ outcome: "Passed" }).eq("id", passingResult);

  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}/releases/${release}/builds/${build}/report`);

  await expect(page.getByText("No failed or blocked test cases")).toBeVisible();
});

test("a Build with no Ready test cases yet shows an honest empty state", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await createTestCase(anna, build); // stays Draft

  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}/releases/${release}/builds/${build}/report`);

  await expect(page.getByText("No ready test cases yet")).toBeVisible();
  await expect(page.getByText("Total Test Cases")).toHaveCount(0);
});

test("Build Details links through to its Report", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);
  await page.getByRole("link", { name: "View Report" }).click();

  await expect(page).toHaveURL(`/projects/${project}/releases/${release}/builds/${build}/report`);
});

test("a non-member cannot reach a Build's Report", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await createProject(anna, "Anna's Secret Project");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await signInAndLand(page, peter);

  const response = await page.goto(`/projects/${project}/releases/${release}/builds/${build}/report`);
  expect(response?.status()).toBe(404);
});
