import { expect, test } from "@playwright/test";

import {
  MAXIMUM_DESCRIPTION_LENGTH,
  MAXIMUM_NAME_LENGTH,
  MAXIMUM_VERSION_LENGTH,
} from "@/lib/releases/limits";

import { signedInUser } from "../support/clients";
import { signIn, signInAndLand } from "../support/flows";
import { createProject } from "../support/projects";
import { createRelease } from "../support/releases";

/**
 * The Releases list and the form that fills it.
 *
 * Seeding a Release runs through `createRelease`, the same insert the Server Action performs — the
 * caller must already be a Member of the Project, exactly as the real path requires.
 */

test("a Project with no Releases is told what to do next", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases`);

  await expect(page.getByRole("heading", { level: 1, name: "Releases" })).toBeVisible();
  await expect(page.getByText("No releases yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "New Release" })).toBeVisible();
});

test("creating a Release lands on it, and it appears on the list with no Builds", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases`);
  await page.getByRole("link", { name: "New Release" }).click();
  await expect(page).toHaveURL(`/projects/${project}/releases/new`);

  await page.getByLabel("Version").fill("1.0.0");
  await page.getByLabel("Name").fill("Payments Overhaul");
  await page.getByLabel("Description").fill("Stripe 3DS and biometric auth.");
  await page.getByRole("button", { name: "Create Release" }).click();

  // Straight into the Release, not back to the list: creating one and starting to add Builds is one
  // motion. Ticket 04 is what makes the second half of that sentence possible.
  await expect(page).toHaveURL(new RegExp(`/projects/${project}/releases/[0-9a-f-]{36}$`));
  await expect(page.getByRole("heading", { level: 1, name: "1.0.0" })).toBeVisible();
  await expect(page.getByText("Payments Overhaul")).toBeVisible();
  await expect(page.getByText("Builds are not here yet")).toBeVisible();

  await page.goto(`/projects/${project}/releases`);
  const row = page.getByRole("listitem").filter({ hasText: "1.0.0" });
  await expect(row.getByRole("link", { name: "1.0.0" })).toBeVisible();
  await expect(row).toContainText("Payments Overhaul");
  await expect(row).toContainText("0 builds");
});

test("a Release can be created with a version alone", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/new`);
  await page.getByLabel("Version").fill("2.0.0");
  await page.getByRole("button", { name: "Create Release" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "2.0.0" })).toBeVisible();

  await page.goto(`/projects/${project}/releases`);
  const row = page.getByRole("listitem").filter({ hasText: "2.0.0" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("0 builds");
});

test("creating a Release with a version already used in the Project is refused", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await createRelease(anna, project, "1.0.0");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases/new`);
  await page.getByLabel("Version").fill("1.0.0");
  await page.getByRole("button", { name: "Create Release" }).click();

  await expect(
    page.getByText(/1\.0\.0 is already used by a release in this project/),
  ).toBeVisible();
  await expect(page).toHaveURL(`/projects/${project}/releases/new`);
});

test("the same version used in a different Project causes no conflict", async ({ page }) => {
  const anna = await signedInUser();
  const home = await createProject(anna, "Mobile Banking App");
  const other = await createProject(anna, "E-Commerce Platform");
  await createRelease(anna, home, "1.0.0");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${other}/releases/new`);
  await page.getByLabel("Version").fill("1.0.0");
  await page.getByRole("button", { name: "Create Release" }).click();

  await expect(page).toHaveURL(new RegExp(`/projects/${other}/releases/[0-9a-f-]{36}$`));
  await expect(page.getByRole("heading", { level: 1, name: "1.0.0" })).toBeVisible();
});

test("a second User's Releases are absent from the first User's list", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const annasProject = await createProject(anna, "Anna's Secret Project");
  await createRelease(anna, annasProject, "9.9.9");
  const petersProject = await createProject(peter, "Peter's Project");

  await signInAndLand(page, peter);

  await page.goto(`/projects/${petersProject}/releases`);
  await expect(page.getByText("No releases yet")).toBeVisible();
  await expect(page.getByText("9.9.9")).toHaveCount(0);
});

test("a non-member finds nothing at the Releases list or a Release's own URL", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await createProject(anna, "Anna's Secret Project");
  const release = await createRelease(anna, project, "1.0.0");
  await signInAndLand(page, peter);

  const list = await page.goto(`/projects/${project}/releases`);
  expect(list?.status()).toBe(404);

  const details = await page.goto(`/projects/${project}/releases/${release}`);
  expect(details?.status()).toBe(404);
  await expect(page.getByText("1.0.0")).toHaveCount(0);
});

test("a Release does not render under a Project it does not belong to", async ({ page }) => {
  const anna = await signedInUser();
  const home = await createProject(anna, "Mobile Banking App");
  const other = await createProject(anna, "E-Commerce Platform");
  const releaseInOther = await createRelease(anna, other, "1.0.0");
  await signInAndLand(page, anna);

  // Anna is a Member of both, so row-level security alone would let this read through — the URL's own
  // Project id is what has to refuse it.
  const response = await page.goto(`/projects/${home}/releases/${releaseInOther}`);
  expect(response?.status()).toBe(404);
});

test("the sidebar's Releases entry opens the list, and marks itself active there", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}`);
  const sidebar = page.getByRole("complementary");
  await sidebar.getByRole("link", { name: "Releases" }).click();

  await expect(page).toHaveURL(`/projects/${project}/releases`);
  await expect(sidebar.getByRole("link", { name: "Releases" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test.describe("what the form refuses", () => {
  test("a version that is blank, or only whitespace", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/releases/new`);

    await page.getByRole("button", { name: "Create Release" }).click();
    await expect(page.getByText("Give the release a version.")).toBeVisible();

    await page.getByLabel("Version").fill("    ");
    await page.getByRole("button", { name: "Create Release" }).click();
    await expect(page.getByText("Give the release a version.")).toBeVisible();

    await expect(page).toHaveURL(`/projects/${project}/releases/new`);
  });

  test("a version past the limit, keeping what was typed", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/releases/new`);

    const tooLong = "1".repeat(MAXIMUM_VERSION_LENGTH + 1);
    await page.getByLabel("Version").fill(tooLong);
    await page.getByRole("button", { name: "Create Release" }).click();

    await expect(page.getByText(`at most ${MAXIMUM_VERSION_LENGTH} characters`)).toBeVisible();
    await expect(page.getByLabel("Version")).toHaveValue(tooLong);
  });

  test("a name past the limit", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/releases/new`);

    await page.getByLabel("Version").fill("1.0.0");
    await page.getByLabel("Name").fill("a".repeat(MAXIMUM_NAME_LENGTH + 1));
    await page.getByRole("button", { name: "Create Release" }).click();

    await expect(page.getByText(`at most ${MAXIMUM_NAME_LENGTH} characters`)).toBeVisible();
    await expect(page.getByLabel("Version")).toHaveValue("1.0.0");
  });

  test("a description past the limit", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/releases/new`);

    await page.getByLabel("Version").fill("1.0.0");
    await page.getByLabel("Description").fill("a".repeat(MAXIMUM_DESCRIPTION_LENGTH + 1));
    await page.getByRole("button", { name: "Create Release" }).click();

    await expect(page.getByText(`at most ${MAXIMUM_DESCRIPTION_LENGTH} characters`)).toBeVisible();
    await expect(page.getByLabel("Version")).toHaveValue("1.0.0");
  });

  test("a version past the limit, answered as they type", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/releases/new`);

    const version = page.getByLabel("Version");
    await version.fill("1".repeat(MAXIMUM_VERSION_LENGTH + 1));
    await version.blur();

    await expect(page.getByText(`at most ${MAXIMUM_VERSION_LENGTH} characters`)).toBeVisible();
    // Still on the form: nothing was submitted to learn that.
    await expect(page).toHaveURL(`/projects/${project}/releases/new`);
  });

  test("a blank version, with the client bundle switched off", async ({ browser }) => {
    // The other half of "validated in the browser and again in the action". With JavaScript the form
    // refuses before submitting, so the action's own validation is never reached from the interface —
    // and the action is what protects a direct POST. Turning the bundle off is the only way to drive
    // the server's copy through a real browser: the form posts natively, and the refusal comes back
    // rendered.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    await signIn(page, anna);
    await expect(page).toHaveURL("/projects");
    await page.goto(`/projects/${project}/releases/new`);

    await page.getByRole("button", { name: "Create Release" }).click();

    await expect(page.getByText("Give the release a version.")).toBeVisible();
    await expect(page).toHaveURL(`/projects/${project}/releases/new`);

    await context.close();
  });

  test("the rule is on the form before anything is submitted", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/releases/new`);

    await expect(page.locator("#version-hint")).toHaveText(`Up to ${MAXIMUM_VERSION_LENGTH} characters.`);
    await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
  });
});
