import { expect, test } from "@playwright/test";

import { createBuild } from "../support/builds";
import { signedInUser } from "../support/clients";
import { signInAndLand } from "../support/flows";
import { createProject, projectWithMember } from "../support/projects";
import { createRelease } from "../support/releases";
import { createTestCase } from "../support/test-cases";

/**
 * Opening a Case, editing it, and deleting it — any Member, not only its creator.
 *
 * Seeding a Case runs through `createTestCase`, the same insert the Server Action performs.
 */

test("clicking a Case in the list opens its Details", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  const testCase = await createTestCase(anna, build, "Sign in with valid credentials");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/${release}/builds/${build}`);
  await page.getByRole("link", { name: "Sign in with valid credentials" }).click();

  await expect(page).toHaveURL(
    `/projects/${project}/releases/${release}/builds/${build}/test-cases/${testCase}`,
  );
});

test("Case Details shows the full definition, including steps, and who created it", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const release = await createRelease(anna, project, "1.0.0");
  const build = await createBuild(anna, release, "100");
  await signInAndLand(page, anna);

  await page.goto(
    `/projects/${project}/releases/${release}/builds/${build}/test-cases/new`,
  );
  await page.getByLabel("Title").fill("Sign in with valid credentials");
  await page.getByLabel("Description").fill("Checks the happy path of signing in.");
  await page.getByLabel("Preconditions").fill("A verified account already exists.");
  await page.getByRole("button", { name: "Add Step" }).click();
  await page.getByLabel("Action").fill("Open the sign-in page");
  // Two fields share the label "Expected Result": the step's own, and the Case's overall one — the
  // step's is first in document order.
  await page.getByLabel("Expected Result").first().fill("The sign-in form is visible");
  await page.getByPlaceholder("The overall expected outcome.").fill("The user lands on the dashboard.");
  await page.getByLabel("Priority").selectOption("Critical");
  await page.getByLabel("Status").selectOption("Ready");
  await page.getByRole("button", { name: "Create Test Case" }).click();

  await page.getByRole("link", { name: "Sign in with valid credentials" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Sign in with valid credentials" })).toBeVisible();
  await expect(page.getByText("TC-001")).toBeVisible();
  await expect(page.getByText("Checks the happy path of signing in.")).toBeVisible();
  await expect(page.getByText("A verified account already exists.")).toBeVisible();
  await expect(page.getByText("Open the sign-in page")).toBeVisible();
  await expect(page.getByText(/Expected: The sign-in form is visible/)).toBeVisible();
  await expect(page.getByText("The user lands on the dashboard.")).toBeVisible();
  await expect(page.getByText("Critical")).toBeVisible();
  // Exact: "Ready" is otherwise a substring match inside "A verified account already exists."
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  await expect(page.getByText(/Created by Seeded Tester/)).toBeVisible();
});

test.describe("editing a Case", () => {
  test("reuses the create form, pre-filled, and any Member can save changes", async ({ page }) => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100");
    const testCase = await createTestCase(anna, build, "Sign in with valid credentials");
    await signInAndLand(page, peter);

    await page.goto(
      `/projects/${project}/releases/${release}/builds/${build}/test-cases/${testCase}`,
    );
    await page.getByRole("link", { name: "Edit" }).click();

    await expect(page.getByLabel("Title")).toHaveValue("Sign in with valid credentials");

    await page.getByLabel("Title").fill("Sign in with an expired password");
    await page.getByLabel("Description").fill("Checks that an expired password is refused.");
    await page.getByLabel("Preconditions").fill("The account's password has expired.");
    await page
      .getByPlaceholder("The overall expected outcome.")
      .fill("The user is asked to reset their password.");
    await page.getByLabel("Priority").selectOption("Critical");
    await page.getByLabel("Status").selectOption("Deprecated");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page).toHaveURL(
      `/projects/${project}/releases/${release}/builds/${build}/test-cases/${testCase}`,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Sign in with an expired password" }),
    ).toBeVisible();
    await expect(page.getByText("Checks that an expired password is refused.")).toBeVisible();
    await expect(page.getByText("The account's password has expired.")).toBeVisible();
    await expect(page.getByText("The user is asked to reset their password.")).toBeVisible();
    await expect(page.getByText("Critical")).toBeVisible();
    await expect(page.getByText("Deprecated")).toBeVisible();
  });

  test("adding a step while editing", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100");
    const testCase = await createTestCase(anna, build, "Sign in with valid credentials");
    await signInAndLand(page, anna);

    await page.goto(
      `/projects/${project}/releases/${release}/builds/${build}/test-cases/${testCase}/edit`,
    );
    await page.getByRole("button", { name: "Add Step" }).click();
    await page.getByLabel("Action").fill("Open the sign-in page");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page).toHaveURL(
      `/projects/${project}/releases/${release}/builds/${build}/test-cases/${testCase}`,
    );
    await expect(page.getByText("Open the sign-in page")).toBeVisible();
  });

  test("reordering and removing steps while editing", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100");
    const testCase = await createTestCase(anna, build, "Sign in with valid credentials");
    await signInAndLand(page, anna);

    await page.goto(
      `/projects/${project}/releases/${release}/builds/${build}/test-cases/${testCase}/edit`,
    );
    await page.getByRole("button", { name: "Add Step" }).click();
    await page.getByLabel("Action").fill("Open the sign-in page");
    await page.getByRole("button", { name: "Add Step" }).click();
    const actions = page.getByLabel("Action");
    await actions.nth(1).fill("Enter valid credentials");

    // Reorder: the second step moves up, so it becomes the first.
    await page.getByRole("button", { name: "Move step 2 up" }).click();
    await expect(actions.nth(0)).toHaveValue("Enter valid credentials");

    // Remove the (now second) step, leaving only "Enter valid credentials".
    await page.getByRole("button", { name: "Remove step 2" }).click();
    await expect(actions).toHaveCount(1);

    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page).toHaveURL(
      `/projects/${project}/releases/${release}/builds/${build}/test-cases/${testCase}`,
    );
    await expect(page.getByText("Enter valid credentials")).toBeVisible();
    await expect(page.getByText("Open the sign-in page")).toHaveCount(0);
  });
});

test.describe("deleting a Case", () => {
  test("asks for confirmation, and any Member can delete", async ({ page }) => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100");
    const testCase = await createTestCase(anna, build, "Sign in with valid credentials");
    await signInAndLand(page, peter);

    await page.goto(
      `/projects/${project}/releases/${release}/builds/${build}/test-cases/${testCase}`,
    );
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("This can't be undone.")).toBeVisible();

    // Cancelling leaves the Case exactly as it was.
    await page.getByRole("button", { name: "Keep things as they are" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Sign in with valid credentials" })).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete test case" }).click();

    await expect(page).toHaveURL(`/projects/${project}/releases/${release}/builds/${build}`);
    await expect(page.getByText("No test cases yet")).toBeVisible();

    // The Case's own Details page is gone, not just absent from the list.
    const response = await page.goto(
      `/projects/${project}/releases/${release}/builds/${build}/test-cases/${testCase}`,
    );
    expect(response?.status()).toBe(404);
  });

  test("a deleted Case's code is never reused", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100");
    const first = await createTestCase(anna, build, "First case");
    await signInAndLand(page, anna);

    await page.goto(`/projects/${project}/releases/${release}/builds/${build}/test-cases/${first}`);
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete test case" }).click();
    await expect(page).toHaveURL(`/projects/${project}/releases/${release}/builds/${build}`);

    await page.getByRole("link", { name: "New Test Case" }).click();
    await page.getByLabel("Title").fill("Second case");
    await page.getByRole("button", { name: "Create Test Case" }).click();

    await expect(page.getByText("TC-002")).toBeVisible();
  });
});

test.describe("access control", () => {
  test("a non-member finds nothing at a Case's own URL", async ({ page }) => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna, "Anna's Secret Project");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100");
    const testCase = await createTestCase(anna, build, "Sign in with valid credentials");
    await signInAndLand(page, peter);

    const response = await page.goto(
      `/projects/${project}/releases/${release}/builds/${build}/test-cases/${testCase}`,
    );
    expect(response?.status()).toBe(404);
  });

  test("a Case does not render under a Build it does not belong to", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    const buildA = await createBuild(anna, release, "100");
    const buildB = await createBuild(anna, release, "200");
    const testCaseInA = await createTestCase(anna, buildA, "Sign in with valid credentials");
    await signInAndLand(page, anna);

    // Anna is a Member of the Project either way, so row-level security alone would let this read
    // through — the URL's own Build id is what has to refuse it.
    const response = await page.goto(
      `/projects/${project}/releases/${release}/builds/${buildB}/test-cases/${testCaseInA}`,
    );
    expect(response?.status()).toBe(404);
  });

  test("a non-member cannot reach the Edit page", async ({ page }) => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna, "Anna's Secret Project");
    const release = await createRelease(anna, project, "1.0.0");
    const build = await createBuild(anna, release, "100");
    const testCase = await createTestCase(anna, build, "Sign in with valid credentials");
    await signInAndLand(page, peter);

    const response = await page.goto(
      `/projects/${project}/releases/${release}/builds/${build}/test-cases/${testCase}/edit`,
    );
    expect(response?.status()).toBe(404);
  });

  test("the Edit page 404s for a Case reached under the wrong Build", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    const buildA = await createBuild(anna, release, "100");
    const buildB = await createBuild(anna, release, "200");
    const testCaseInA = await createTestCase(anna, buildA, "Sign in with valid credentials");
    await signInAndLand(page, anna);

    const response = await page.goto(
      `/projects/${project}/releases/${release}/builds/${buildB}/test-cases/${testCaseInA}/edit`,
    );
    expect(response?.status()).toBe(404);
  });
});
