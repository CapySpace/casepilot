import { expect, test } from "@playwright/test";

import { createBuild } from "../support/builds";
import { signedInUser } from "../support/clients";
import { signInAndLand } from "../support/flows";
import { createProject } from "../support/projects";
import { createRelease } from "../support/releases";
import { createTestCase } from "../support/test-cases";

/**
 * Searching and filtering a Build's Test Cases — client-side, over the list ticket 02 already loads.
 */

async function seedThreeCases(anna: Awaited<ReturnType<typeof signedInUser>>) {
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");

  const signIn = await createTestCase(anna, build, "Sign in with valid credentials");
  const signOut = await createTestCase(anna, build, "Sign out clears the session");
  const resetPassword = await createTestCase(anna, build, "Reset an expired password");

  return { project, release, build, signIn, signOut, resetPassword };
}

test("searching by title filters the list, client-side", async ({ page }) => {
  const anna = await signedInUser();
  const { project, release, build } = await seedThreeCases(anna);
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);
  await expect(page.getByRole("link", { name: "Sign in with valid credentials" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign out clears the session" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reset an expired password" })).toBeVisible();

  await page.getByLabel("Search test cases by title").fill("sign");

  await expect(page.getByRole("link", { name: "Sign in with valid credentials" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign out clears the session" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reset an expired password" })).toHaveCount(0);
});

test("filtering by priority and status, alone and combined", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await signInAndLand(page, anna);

  // Seed through the real form so priority/status are actually set — the support helper only sets a
  // title.
  async function newCase(title: string, priority: string, status: string) {
    await page.goto(`/projects/${project}/releases/${release}/builds/${build}/test-cases/new`);
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Priority").selectOption(priority);
    await page.getByLabel("Status").selectOption(status);
    await page.getByRole("button", { name: "Create Test Case" }).click();
  }

  await newCase("Sign in with valid credentials", "Critical", "Ready");
  await newCase("Sign out clears the session", "Low", "Draft");
  await newCase("Reset an expired password", "Critical", "Draft");

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);

  // Priority alone.
  await page.getByLabel("Filter by priority").selectOption("Critical");
  await expect(page.getByRole("link", { name: "Sign in with valid credentials" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reset an expired password" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign out clears the session" })).toHaveCount(0);

  // Combined with status.
  await page.getByLabel("Filter by status").selectOption("Ready");
  await expect(page.getByRole("link", { name: "Sign in with valid credentials" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reset an expired password" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign out clears the session" })).toHaveCount(0);

  // Status alone, priority cleared (the "All priorities" option's value is the empty string).
  await page.getByLabel("Filter by priority").selectOption("");
  await page.getByLabel("Filter by status").selectOption("Draft");
  await expect(page.getByRole("link", { name: "Sign out clears the session" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reset an expired password" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in with valid credentials" })).toHaveCount(0);
});

test("a search with no matches shows a distinct message, and clearing it restores the list", async ({
  page,
}) => {
  const anna = await signedInUser();
  const { project, release, build } = await seedThreeCases(anna);
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);
  await page.getByLabel("Search test cases by title").fill("nothing matches this");

  await expect(page.getByText("No test cases match this search.")).toBeVisible();
  await expect(page.getByText("No test cases yet")).toHaveCount(0);
  // The list itself isn't rendered when nothing matches — not an empty list, no list at all.
  await expect(page.getByRole("list", { name: "Test Cases" })).toHaveCount(0);

  await page.getByLabel("Search test cases by title").fill("");

  await expect(page.getByRole("link", { name: "Sign in with valid credentials" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign out clears the session" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reset an expired password" })).toBeVisible();
  await expect(page.getByText("No test cases match this search.")).toHaveCount(0);
});

test("search and filter controls are absent from a Build with no test cases at all", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);

  await expect(page.getByText("No test cases yet")).toBeVisible();
  await expect(page.getByLabel("Search test cases by title")).toHaveCount(0);
});
