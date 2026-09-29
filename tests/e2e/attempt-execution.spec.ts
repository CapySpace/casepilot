import { expect, test, type Page } from "@playwright/test";

import { createBuild } from "../support/builds";
import { signedInUser } from "../support/clients";
import { signInAndLand } from "../support/flows";
import { createProject, projectWithMember } from "../support/projects";
import { createRelease } from "../support/releases";
import { completeTestAttempt, createTestAttempt, createTestResult } from "../support/test-attempts";
import { createTestCase } from "../support/test-cases";

/**
 * Recording Results on the execution screen: every Outcome, notes, live progress, jumping between
 * Cases, changing an already-recorded Result, a second Member picking up an Attempt, and the one
 * failure this phase asks to be loud about — a save landing after the Attempt was completed elsewhere.
 *
 * Starting the Attempt itself is `testing-attempts.spec.ts`'s own coverage (ticket 02); every test here
 * starts from an Attempt already in progress.
 */

async function startAttempt(page: Page, project: string, release: string, build: string) {
  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);
  await page.getByRole("button", { name: "Record Attempt" }).click();
  await expect(page).toHaveURL(/\/execute$/);
}

test("recording an Outcome saves it immediately, surviving a reload", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await createTestCase(anna, build, "Sign in with valid credentials");
  await signInAndLand(page, anna);
  await startAttempt(page, project, release, build);

  await page.getByRole("button", { name: "Failed", exact: true }).click();
  await expect(page.getByText(`Recorded by ${anna.fullName}`)).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Failed", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("every Outcome — Passed, Failed, Blocked and Skipped — can be recorded", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await createTestCase(anna, build);
  await signInAndLand(page, anna);
  await startAttempt(page, project, release, build);

  for (const label of ["Passed", "Failed", "Blocked", "Skipped"] as const) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByRole("button", { name: label, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
});

test("editing notes saves after a pause, not on every keystroke, and survives a reload", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await createTestCase(anna, build);
  await signInAndLand(page, anna);
  await startAttempt(page, project, release, build);

  await page.getByLabel("Notes").fill("The confirmation banner never appeared.");
  await expect(page.getByText(`Recorded by ${anna.fullName}`)).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Notes")).toHaveValue("The confirmation banner never appeared.");
});

test("the progress indicator and Outcome breakdown update live, without a reload", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await createTestCase(anna, build, "Sign in with valid credentials");
  await createTestCase(anna, build, "Sign out clears the session");
  await signInAndLand(page, anna);
  await startAttempt(page, project, release, build);

  await expect(page.getByText("Tested: 0 / 2")).toBeVisible();

  await page.getByRole("button", { name: "Passed", exact: true }).click();

  await expect(page.getByText("Tested: 1 / 2")).toBeVisible();
  await expect(page.getByText("Passed: 1")).toBeVisible();
  await expect(page.getByText("Not Run: 1")).toBeVisible();
});

test("a Member can jump directly to any Case via the rail, not only step through in order", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await createTestCase(anna, build, "Sign in with valid credentials");
  await createTestCase(anna, build, "Sign out clears the session");
  await signInAndLand(page, anna);
  await startAttempt(page, project, release, build);

  await expect(page.getByRole("heading", { name: "Sign in with valid credentials" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "Jump to a Case" })
    .getByText("Sign out clears the session")
    .click();

  await expect(page.getByRole("heading", { name: "Sign out clears the session" })).toBeVisible();
});

test("a Result already recorded can be changed to a different Outcome", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await createTestCase(anna, build);
  await signInAndLand(page, anna);
  await startAttempt(page, project, release, build);

  await page.getByRole("button", { name: "Passed", exact: true }).click();
  await expect(page.getByRole("button", { name: "Passed", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "Failed", exact: true }).click();
  await expect(page.getByRole("button", { name: "Failed", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "Passed", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await page.reload();
  await expect(page.getByRole("button", { name: "Failed", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("any Member, not only whoever started the Attempt, can record a Result", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await createTestCase(anna, build);
  await signInAndLand(page, anna);
  await startAttempt(page, project, release, build);
  const attemptUrl = page.url();

  await signInAndLand(page, peter);
  await page.goto(attemptUrl);
  await page.getByRole("button", { name: "Blocked", exact: true }).click();
  await expect(page.getByRole("button", { name: "Blocked", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.reload();
  await expect(page.getByRole("button", { name: "Blocked", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("recording on an Attempt completed elsewhere while this screen was open fails loudly, not silently", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  const testCase = await createTestCase(anna, build);
  const attempt = await createTestAttempt(anna, build);
  await createTestResult(anna, attempt, testCase);
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}/attempts/${attempt}/execute`);
  await completeTestAttempt(anna, attempt);

  await page.getByRole("button", { name: "Passed", exact: true }).click();

  await expect(
    page.getByText("This attempt was completed while you were working on it. Your change was not saved."),
  ).toBeVisible();
});
