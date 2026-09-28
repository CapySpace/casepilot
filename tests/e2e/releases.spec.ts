import { expect, test } from "@playwright/test";

import {
  MAXIMUM_DESCRIPTION_LENGTH,
  MAXIMUM_NAME_LENGTH,
  MAXIMUM_VERSION_LENGTH,
} from "@/lib/releases/limits";

import { signedInUser } from "../support/clients";
import { createBuild } from "../support/builds";
import { signIn, signInAndLand } from "../support/flows";
import { createProject, projectWithMember } from "../support/projects";
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
  await expect(page.getByText("No builds yet")).toBeVisible();

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

test("the release list searches versions, names, descriptions, and keeps real Build counts", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const payments = await createRelease(anna, project, "2.4.0", {
    name: "Payments Overhaul",
    description: "Stripe 3DS and biometric auth.",
  });
  await createBuild(anna, payments, "100");
  await createRelease(anna, project, "2.3.0", {
    name: "Invitations",
    description: "Multi-tenant role permissions.",
  });
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/releases`);
  await page.getByLabel("Search releases").fill("stripe");

  const row = page.getByRole("listitem").filter({ hasText: "2.4.0" });
  await expect(row.getByRole("heading", { level: 2, name: "2.4.0" })).toBeVisible();
  await expect(page.getByText("2.3.0")).toHaveCount(0);
  await expect(row).toContainText("Payments Overhaul");
  await expect(row).toContainText("Stripe 3DS and biometric auth.");
  await expect(row).toContainText("1 build");
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

test.describe("Release Details", () => {
  test("shows the Release's version, name and description in full", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0", {
      name: "Payments Overhaul",
      description: "Stripe 3DS and biometric auth.",
    });
    await signInAndLand(page, anna);

    await page.goto(`/projects/${project}/releases/${release}`);

    await expect(page.getByRole("heading", { level: 1, name: "1.0.0" })).toBeVisible();
    await expect(page.getByText("Payments Overhaul")).toBeVisible();
    await expect(page.getByText("Stripe 3DS and biometric auth.")).toBeVisible();
    await expect(page.getByText("No builds yet")).toBeVisible();
  });

  test("editing updates the Release's values without a reload", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0", { name: "Payments Overhaul" });
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/releases/${release}`);

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Version").fill("1.0.1");
    await page.getByLabel("Name").fill("Payments Overhaul v2");
    await page.getByLabel("Description").fill("Adds Apple Pay.");
    await page.getByRole("button", { name: "Save Changes" }).click();

    // The same URL throughout: this is an edit in place, not a navigation to a new one.
    await expect(page).toHaveURL(`/projects/${project}/releases/${release}`);
    await expect(page.getByRole("heading", { level: 1, name: "1.0.1" })).toBeVisible();
    await expect(page.getByText("Payments Overhaul v2")).toBeVisible();
    await expect(page.getByText("Adds Apple Pay.")).toBeVisible();
    await expect(page.getByText("Release updated.")).toBeVisible();
    // The form closed on success: there is nothing left to press Save on.
    await expect(page.getByRole("button", { name: "Save Changes" })).toHaveCount(0);

    // Reloading proves the write actually reached the database, not only this page's own state.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "1.0.1" })).toBeVisible();
  });

  test("a second successful edit in the same visit also closes the form", async ({ page }) => {
    // Guards against comparing the previous save's *message text* rather than the save itself: two
    // successes in a row produce the identical "Release updated." notice, which a value comparison
    // would see as unchanged and leave the form open on the second save despite it having worked.
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/releases/${release}`);

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Version").fill("1.0.1");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "1.0.1" })).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Version").fill("1.0.2");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "1.0.2" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Changes" })).toHaveCount(0);
  });

  test("a Member who is not the Project's Owner can also edit", async ({ page }) => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    await signInAndLand(page, peter);
    await page.goto(`/projects/${project}/releases/${release}`);

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Name").fill("Named by a Member");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByText("Named by a Member")).toBeVisible();
  });

  test("editing a version to blank is refused, keeping the form open", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/releases/${release}`);

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Version").fill("   ");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByText("Give the release a version.")).toBeVisible();
    // Still in the form, unsaved: the original version is untouched underneath it.
    await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();
  });

  test("editing a version into one already used elsewhere in the Project is refused", async ({
    page,
  }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    await createRelease(anna, project, "2.0.0");
    const release = await createRelease(anna, project, "1.0.0");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/releases/${release}`);

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Version").fill("2.0.0");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(
      page.getByText(/2\.0\.0 is already used by a release in this project/),
    ).toBeVisible();
    await expect(page.getByLabel("Version")).toHaveValue("2.0.0");

    // Nothing was actually changed: reloading shows the original version still stands.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "1.0.0" })).toBeVisible();
  });

  test("editing a version into one used in a different Project succeeds", async ({ page }) => {
    const anna = await signedInUser();
    const home = await createProject(anna, "Mobile Banking App");
    const other = await createProject(anna, "E-Commerce Platform");
    await createRelease(anna, other, "1.0.0");
    const release = await createRelease(anna, home, "2.0.0");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${home}/releases/${release}`);

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Version").fill("1.0.0");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "1.0.0" })).toBeVisible();
    await expect(page.getByText("Release updated.")).toBeVisible();
  });

  test("cancelling an edit discards it", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    const release = await createRelease(anna, project, "1.0.0");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/releases/${release}`);

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Version").fill("9.9.9");
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "1.0.0" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Changes" })).toHaveCount(0);
  });
});
