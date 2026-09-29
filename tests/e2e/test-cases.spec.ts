import { expect, test } from "@playwright/test";

import { MAXIMUM_DESCRIPTION_LENGTH, MAXIMUM_TITLE_LENGTH } from "@/lib/test-cases/limits";

import { createBuild } from "../support/builds";
import { signedInUser } from "../support/clients";
import { signInAndLand } from "../support/flows";
import { createProject, projectWithMember } from "../support/projects";
import { createRelease } from "../support/releases";
import { createTestCase } from "../support/test-cases";

/**
 * Creating a Case from Build Details, the Test Cases list it appears in, and the steps builder on the
 * New Test Case page.
 *
 * Seeding a Case runs through `createTestCase`, the same insert the Server Action performs — the caller
 * must already be a Member of the Project that owns the Build, exactly as the real path requires.
 */

test("creating a test case from Build Details shows it immediately in the list", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);
  await expect(page.getByText("No test cases yet")).toBeVisible();

  await page.getByRole("link", { name: "New Test Case" }).click();
  await page.getByLabel("Title").fill("Sign in with valid credentials");
  await page.getByRole("button", { name: "Create Test Case" }).click();

  await expect(page).toHaveURL(`/projects/${project}/releases/${release}/builds/${build}`);
  await expect(page.getByText("TC-001")).toBeVisible();
  await expect(page.getByText("Sign in with valid credentials")).toBeVisible();
  await expect(page.getByText("No test cases yet")).toHaveCount(0);
});

test("a Member who is not the Project's Owner can also create a test case", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await signInAndLand(page, peter);

  await page.goto(
    `/projects/${project}/releases/${release}/builds/${build}/test-cases/new`,
  );
  await page.getByLabel("Title").fill("Sign out clears the session");
  await page.getByRole("button", { name: "Create Test Case" }).click();

  await expect(page.getByText("Sign out clears the session")).toBeVisible();
});

test("creating a test case with steps: adding, reordering and removing them", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await signInAndLand(page, anna);

  await page.goto(
    `/projects/${project}/releases/${release}/builds/${build}/test-cases/new`,
  );
  await page.getByLabel("Title").fill("Sign in with valid credentials");

  await page.getByRole("button", { name: "Add Step" }).click();
  await page.getByLabel("Action").fill("Open the sign-in page");

  await page.getByRole("button", { name: "Add Step" }).click();
  const actions = page.getByLabel("Action");
  await expect(actions).toHaveCount(2);
  await actions.nth(1).fill("Enter valid credentials");

  // Reorder: move the second step up, so it becomes the first.
  await page.getByRole("button", { name: "Move step 2 up" }).click();
  await expect(actions.nth(0)).toHaveValue("Enter valid credentials");
  await expect(actions.nth(1)).toHaveValue("Open the sign-in page");

  // Remove the (now first) step, leaving one.
  await page.getByRole("button", { name: "Remove step 1" }).click();
  await expect(actions).toHaveCount(1);
  await expect(actions).toHaveValue("Open the sign-in page");

  await page.getByRole("button", { name: "Create Test Case" }).click();

  await expect(page).toHaveURL(`/projects/${project}/releases/${release}/builds/${build}`);
  await expect(page.getByText("Sign in with valid credentials")).toBeVisible();
});

test("a test case can be created with no steps at all", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await signInAndLand(page, anna);

  await page.goto(
    `/projects/${project}/releases/${release}/builds/${build}/test-cases/new`,
  );
  await page.getByLabel("Title").fill("A case with no steps yet");
  await page.getByRole("button", { name: "Create Test Case" }).click();

  await expect(page.getByText("A case with no steps yet")).toBeVisible();
});

test("the test case list shows every Case under a Build, newest first", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await createTestCase(anna, build, "First case");
  await createTestCase(anna, build, "Second case");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);

  await expect(page.getByText("First case")).toBeVisible();
  await expect(page.getByText("Second case")).toBeVisible();
  await expect(page.getByText("2", { exact: true })).toBeVisible();

  const list = page.getByRole("list", { name: "Test Cases" });
  await expect(list.getByText(/First case|Second case/)).toHaveText(["Second case", "First case"]);
});

test.describe("what the New Test Case form refuses", () => {
  test("a title that is blank, or only whitespace", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100");
    await signInAndLand(page, anna);

    await page.goto(
      `/projects/${project}/releases/${release}/builds/${build}/test-cases/new`,
    );

    await page.getByRole("button", { name: "Create Test Case" }).click();
    await expect(page.getByText("Give the test case a title.")).toBeVisible();

    await page.getByLabel("Title").fill("    ");
    await page.getByRole("button", { name: "Create Test Case" }).click();
    await expect(page.getByText("Give the test case a title.")).toBeVisible();
  });

  test("a title past the limit, keeping what was typed", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100");
    await signInAndLand(page, anna);

    await page.goto(
      `/projects/${project}/releases/${release}/builds/${build}/test-cases/new`,
    );

    const tooLong = "a".repeat(MAXIMUM_TITLE_LENGTH + 1);
    await page.getByLabel("Title").fill(tooLong);
    await page.getByRole("button", { name: "Create Test Case" }).click();

    await expect(page.getByText(`at most ${MAXIMUM_TITLE_LENGTH} characters`)).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue(tooLong);
  });

  test("a description past the limit, keeping what was typed", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100");
    await signInAndLand(page, anna);

    await page.goto(
      `/projects/${project}/releases/${release}/builds/${build}/test-cases/new`,
    );

    const tooLong = "a".repeat(MAXIMUM_DESCRIPTION_LENGTH + 1);
    await page.getByLabel("Title").fill("Sign in");
    await page.getByLabel("Description").fill(tooLong);
    await page.getByRole("button", { name: "Create Test Case" }).click();

    await expect(page.getByText(`at most ${MAXIMUM_DESCRIPTION_LENGTH} characters`)).toBeVisible();
    await expect(page.getByLabel("Description")).toHaveValue(tooLong);
  });

  test("a step with a blank action", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100");
    await signInAndLand(page, anna);

    await page.goto(
      `/projects/${project}/releases/${release}/builds/${build}/test-cases/new`,
    );
    await page.getByLabel("Title").fill("Sign in");
    await page.getByRole("button", { name: "Add Step" }).click();
    await page.getByRole("button", { name: "Create Test Case" }).click();

    await expect(page.getByText("Give this step an action.")).toBeVisible();
  });
});

test.describe("Build Details", () => {
  test("a non-member cannot reach the New Test Case page", async ({ page }) => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna, "Anna's Secret Project");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100");
    await signInAndLand(page, peter);

    const response = await page.goto(
      `/projects/${project}/releases/${release}/builds/${build}/test-cases/new`,
    );
    expect(response?.status()).toBe(404);
  });
});
