import { expect, test } from "@playwright/test";

import { createBuild } from "../support/builds";
import { signedInUser } from "../support/clients";
import { signInAndLand } from "../support/flows";
import { createProject, projectWithMember } from "../support/projects";
import { createRelease } from "../support/releases";
import { createTestCase } from "../support/test-cases";

/**
 * Starting an Attempt from Build Details, and the Testing Attempts section it appears in.
 *
 * Recording a Result is not exercised here — ticket 03's own work, per the phase spec's
 * `attempt-execution.spec.ts` split. This file covers exactly what ticket 02 builds: the button, the
 * transactional creation, the redirect, and the list.
 */

test("starting a testing attempt redirects to its execution page, showing the Case's snapshot", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await createTestCase(anna, build, "Sign in with valid credentials");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);
  await expect(page.getByText("No testing attempts yet")).toBeVisible();

  await page.getByRole("button", { name: "Record Attempt" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/projects/${project}/releases/${release}/builds/${build}/attempts/.+/execute$`),
  );
  await expect(page.getByRole("heading", { name: "Attempt #1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in with valid credentials" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Jump to a Case" }).getByText("Not Run"),
  ).toBeVisible();
  await expect(page.getByText("Tested: 0 / 1")).toBeVisible();
});

test("a Member who is not the Project's Owner can also start an attempt", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await createTestCase(anna, build, "Sign out clears the session");
  await signInAndLand(page, peter);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);
  await page.getByRole("button", { name: "Record Attempt" }).click();

  await expect(page.getByText("Sign out clears the session")).toBeVisible();
});

test("the Testing Attempts section shows a started attempt's number, tester and progress", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await createTestCase(anna, build, "Sign in with valid credentials");
  await createTestCase(anna, build, "Sign out clears the session");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);
  await page.getByRole("button", { name: "Record Attempt" }).click();
  await expect(page).toHaveURL(/\/execute$/);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);

  await expect(page.getByText("Attempt #1")).toBeVisible();
  await expect(page.getByText(`Started by ${anna.fullName}`)).toBeVisible();
  await expect(page.getByText("In Progress")).toBeVisible();
  await expect(page.getByText("Tested: 0 / 2")).toBeVisible();
});

test("starting a second attempt on the same Build numbers it distinctly", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await createTestCase(anna, build);
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);
  await page.getByRole("button", { name: "Record Attempt" }).click();
  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);
  await page.getByRole("button", { name: "Record Attempt" }).click();
  await expect(page.getByRole("heading", { name: "Attempt #2" })).toBeVisible();

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);
  await expect(page.getByText("Attempt #1")).toBeVisible();
  await expect(page.getByText("Attempt #2")).toBeVisible();
});

test("Record Attempt is disabled on a Build with no eligible test cases, with an explanation", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);

  await expect(page.getByRole("button", { name: "Record Attempt" })).toBeDisabled();
  await expect(
    page.getByText("Add a test case to this build before starting a testing attempt."),
  ).toBeVisible();
});

test("a non-member cannot reach a Build's execution page", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await createProject(anna, "Anna's Secret Project");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await createTestCase(anna, build);
  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);
  await page.getByRole("button", { name: "Record Attempt" }).click();
  await expect(page).toHaveURL(/\/execute$/);
  const attemptUrl = page.url();

  await signInAndLand(page, peter);
  const response = await page.goto(attemptUrl);
  expect(response?.status()).toBe(404);
});
