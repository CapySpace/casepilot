import { expect, test } from "@playwright/test";

import { MAXIMUM_DESCRIPTION_LENGTH, MAXIMUM_NAME_LENGTH } from "@/lib/projects/limits";

import { formError, signIn, signInAndLand } from "../support/flows";
import { signedInUser } from "../support/clients";
import { createProject, projectWithMember } from "../support/projects";

/**
 * The Projects list and the form that fills it.
 *
 * Seeding runs through the same API a browser would reach — `signedInUser()` returns credentials the
 * browser then signs in with, so the Projects a test arranges belong to the User who signs in. What
 * cannot be arranged through the interface yet is accepting an Invitation, which ticket 06 builds;
 * until then the one test that needs a second Member arranges it through the provider's own API as
 * the real Users, never with the secret key.
 */

test("a User with no Projects is told what to do next", async ({ page }) => {
  const anna = await signedInUser();

  await signIn(page, anna);

  await expect(page).toHaveURL("/projects");
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  await expect(page.getByText("You are not in any projects yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "New Project" })).toBeVisible();
});

test("the root sends a signed-in User to their Projects", async ({ page }) => {
  const anna = await signedInUser();
  await signInAndLand(page, anna);

  await page.goto("/");

  await expect(page).toHaveURL("/projects");
});

test("creating a Project opens it, and it appears on the list", async ({ page }) => {
  const anna = await signedInUser();
  await signInAndLand(page, anna);

  await page.getByRole("link", { name: "New Project" }).click();
  await expect(page).toHaveURL("/projects/new");

  await page.getByLabel("Project Name").fill("Mobile Banking App");
  await page.getByLabel("Description").fill("Where the mobile banking system gets tested.");
  await page.getByRole("button", { name: "Create Project" }).click();

  // Straight into the Project, not back to the list: creating and using it are one motion.
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Mobile Banking App" })).toBeVisible();

  await page.goto("/projects");
  // The row, not the link: the link is named for the Project alone, so that following it is not
  // announced as "Mobile Banking App, testing notes, Owner, 1 member".
  const row = page.getByRole("listitem").filter({ hasText: "Mobile Banking App" });
  await expect(row.getByRole("link", { name: "Mobile Banking App" })).toBeVisible();
  await expect(row).toContainText("Owner");
  await expect(row).toContainText("1 member");
});

test("a Project shows how many people are in it, and each of them their own Role", async ({
  page,
}) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  await projectWithMember(anna, peter, "E-Commerce Platform");

  await signInAndLand(page, anna);
  const asOwner = page.getByRole("listitem").filter({ hasText: "E-Commerce Platform" });
  await expect(asOwner).toContainText("Owner");
  await expect(asOwner).toContainText("2 members");

  await page.goto("/sign-in");
  await signInAndLand(page, peter);
  const asMember = page.getByRole("listitem").filter({ hasText: "E-Commerce Platform" });
  await expect(asMember).toContainText("Member");
  await expect(asMember).toContainText("2 members");
});

test("the list is alphabetical, however the Projects arrived", async ({ page }) => {
  const anna = await signedInUser();
  await createProject(anna, "Zebra Crossing");
  await createProject(anna, "Alpha Centauri");
  await createProject(anna, "Mobile Banking App");

  await signInAndLand(page, anna);

  // Ordered by the database, which is why this is worth asserting: an `order` that silently applies
  // to an embedded table instead of the rows themselves looks identical in the code and does nothing.
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Alpha Centauri",
    "Mobile Banking App",
    "Zebra Crossing",
  ]);
});

test("the toolbar filters Projects by search text and relationship", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  await createProject(anna, "Alpha Centauri");
  await createProject(anna, "Billing Console");
  await projectWithMember(peter, anna, "Shared Gateway");

  await signInAndLand(page, anna);

  await page.getByLabel("Filter projects").fill("billing");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Billing Console"]);

  await page.getByLabel("Filter projects").fill("");
  await page.getByRole("button", { name: "Shared (1)" }).click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Shared Gateway"]);

  await page.getByRole("button", { name: "Owned by me (2)" }).click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Alpha Centauri",
    "Billing Console",
  ]);
});

test("another User's Projects are nowhere on the list", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  await createProject(anna, "Anna's Secret Project");

  await signIn(page, peter);

  await expect(page.getByText("You are not in any projects yet")).toBeVisible();
  await expect(page.getByText("Anna's Secret Project")).toHaveCount(0);
});

test("opening a Project somebody else owns says only that there is nothing there", async ({
  page,
}) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await createProject(anna, "Anna's Secret Project");

  await signInAndLand(page, peter);
  const response = await page.goto(`/projects/${project}`);

  expect(response?.status()).toBe(404);
  await expect(page.getByText("Anna's Secret Project")).toHaveCount(0);
});

test.describe("what the form refuses", () => {
  test("a name that is blank, or only whitespace", async ({ page }) => {
    const anna = await signedInUser();
    await signInAndLand(page, anna);
    await page.goto("/projects/new");

    await page.getByRole("button", { name: "Create Project" }).click();
    await expect(page.getByText("Give the project a name.")).toBeVisible();

    await page.getByLabel("Project Name").fill("    ");
    await page.getByRole("button", { name: "Create Project" }).click();
    await expect(page.getByText("Give the project a name.")).toBeVisible();

    await expect(page).toHaveURL("/projects/new");
  });

  test("a name past the limit, keeping what was typed", async ({ page }) => {
    const anna = await signedInUser();
    await signInAndLand(page, anna);
    await page.goto("/projects/new");

    const tooLong = "a".repeat(MAXIMUM_NAME_LENGTH + 1);
    await page.getByLabel("Project Name").fill(tooLong);
    await page.getByRole("button", { name: "Create Project" }).click();

    await expect(page.getByText(`at most ${MAXIMUM_NAME_LENGTH} characters`)).toBeVisible();
    await expect(page.getByLabel("Project Name")).toHaveValue(tooLong);
  });

  test("a description past the limit", async ({ page }) => {
    const anna = await signedInUser();
    await signInAndLand(page, anna);
    await page.goto("/projects/new");

    await page.getByLabel("Project Name").fill("Mobile Banking App");
    await page.getByLabel("Description").fill("a".repeat(MAXIMUM_DESCRIPTION_LENGTH + 1));
    await page.getByRole("button", { name: "Create Project" }).click();

    await expect(page.getByText(`at most ${MAXIMUM_DESCRIPTION_LENGTH} characters`)).toBeVisible();
    await expect(page.getByLabel("Project Name")).toHaveValue("Mobile Banking App");
  });

  test("a name past the limit, answered as they type", async ({ page }) => {
    const anna = await signedInUser();
    await signInAndLand(page, anna);
    await page.goto("/projects/new");

    const name = page.getByLabel("Project Name");
    await name.fill("a".repeat(MAXIMUM_NAME_LENGTH + 1));
    await name.blur();

    await expect(page.getByText(`at most ${MAXIMUM_NAME_LENGTH} characters`)).toBeVisible();
    // Still on the form: nothing was submitted to learn that.
    await expect(page).toHaveURL("/projects/new");
  });

  test("a blank name, with the client bundle switched off", async ({ browser }) => {
    // The other half of "validated in the browser and again in the action". With JavaScript the form
    // refuses before submitting, so the action's own validation is never reached from the interface —
    // and the action is what protects a direct POST. Turning the bundle off is the only way to drive
    // the server's copy through a real browser: the form posts natively, and the refusal comes back
    // rendered.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    const anna = await signedInUser();
    await signIn(page, anna);
    await expect(page).toHaveURL("/projects");
    await page.goto("/projects/new");

    await page.getByRole("button", { name: "Create Project" }).click();

    await expect(page.getByText("Give the project a name.")).toBeVisible();
    await expect(page).toHaveURL("/projects/new");

    await context.close();
  });

  test("the rule is on the form before anything is submitted", async ({ page }) => {
    const anna = await signedInUser();
    await signInAndLand(page, anna);
    await page.goto("/projects/new");

    await expect(page.getByText(`Up to ${MAXIMUM_NAME_LENGTH} characters`)).toBeVisible();
    await expect(formError(page)).toHaveCount(0);
  });
});
