import { expect, test } from "@playwright/test";

import { signedInUser } from "../support/clients";
import { signInAndLand } from "../support/flows";
import { inviteByEmail } from "../support/invitations";
import { createProject, projectWithMember } from "../support/projects";

/**
 * Leaving a Project, and being removed from one.
 *
 * Both end the same way — the Membership is gone, so the Project is gone — and both ask first. The question
 * is a dialog, which is the one place in the phase that needs JavaScript; the mutation behind it is still a
 * form post.
 */

test("a Member leaves, after being asked", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking App");
  await signInAndLand(page, peter);

  await page.goto(`/projects/${project}/settings`);
  await page.getByRole("button", { name: "Leave project" }).click();

  // Asked, and told what it costs, before anything happens.
  await expect(page.getByRole("alertdialog")).toContainText("Leave this project?");
  await expect(page.getByRole("alertdialog")).toContainText(/lose access/);

  await page.getByRole("button", { name: "Keep things as they are" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page).toHaveURL(`/projects/${project}/settings`);

  await page.getByRole("button", { name: "Leave project" }).click();
  // Scoped to the dialog: the trigger and the confirming button share a label, as they should — the second
  // press is the same decision, not a different one.
  await page.getByRole("alertdialog").getByRole("button", { name: "Leave project" }).click();

  await expect(page).toHaveURL("/projects");
  await expect(page.getByText("You are not in any projects yet")).toBeVisible();

  // Genuinely gone, not merely off the list.
  const response = await page.goto(`/projects/${project}`);
  expect(response?.status()).toBe(404);
});

test("an Owner has no way to leave, and is told what would have to change", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/settings`);

  await expect(page.getByRole("button", { name: "Leave project" })).toHaveCount(0);
  await expect(page.getByText(/As the owner you cannot leave/)).toBeVisible();
});

test("an Owner removes a Member, after being asked", async ({ browser, page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking App");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/members`);
  await page.getByRole("button", { name: `Remove ${peter.fullName}` }).click();

  await expect(page.getByRole("alertdialog")).toContainText(`Remove ${peter.fullName}?`);
  await page.getByRole("button", { name: "Remove from project" }).click();

  // The row going is what a successful removal looks like, and the count above the table with it.
  await expect(page.getByRole("row").filter({ hasText: peter.email })).toHaveCount(0);
  await expect(page.getByText("1 member of Mobile Banking App")).toBeVisible();

  // And everywhere else that counts people, because three pages do and only one of them was revalidated
  // until this test existed.
  await page.goto(`/projects/${project}`);
  await expect(page.getByText("1 member")).toBeVisible();
  await page.goto("/projects");
  await expect(
    page.getByRole("listitem").filter({ hasText: "Mobile Banking App" }),
  ).toContainText("1 member");

  // Immediately, for them, in their own browser.
  const theirs = await browser.newContext();
  const theirPage = await theirs.newPage();
  await signInAndLand(theirPage, peter);
  await expect(theirPage.getByText("You are not in any projects yet")).toBeVisible();
  const response = await theirPage.goto(`/projects/${project}`);
  expect(response?.status()).toBe(404);
  await theirs.close();
});

test("a Member sees no way to remove anybody", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking App");
  await signInAndLand(page, peter);

  await page.goto(`/projects/${project}/members`);

  await expect(page.getByRole("row").filter({ hasText: anna.email })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);
});

test("somebody removed can be invited again and accept", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking App");
  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}/members`);
  await page.getByRole("button", { name: `Remove ${peter.fullName}` }).click();
  await page.getByRole("button", { name: "Remove from project" }).click();
  await expect(page.getByRole("row").filter({ hasText: peter.email })).toHaveCount(0);

  const { token } = await inviteByEmail(anna, project, peter.email);

  await page.goto("/sign-in");
  await signInAndLand(page, peter);
  await page.goto(`/invitations/${token}`);
  await page.getByRole("button", { name: /Join Mobile Banking App/ }).click();

  await expect(page).toHaveURL(new RegExp(`/projects/${project}$`));
});

test("cancelling an Invitation asks first", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await inviteByEmail(anna, project, "peter@example.com");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/members`);
  await page.getByRole("button", { name: /Cancel the invitation to peter@example\.com/ }).click();

  await expect(page.getByRole("alertdialog")).toContainText("Cancel this invitation?");
  await page.getByRole("button", { name: "Keep things as they are" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "peter@example.com" })).toHaveCount(1);

  await page.getByRole("button", { name: /Cancel the invitation to peter@example\.com/ }).click();
  await page.getByRole("button", { name: "Cancel invitation" }).click();

  await expect(page.getByText(/Invitation cancelled/)).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "peter@example.com" })).toHaveCount(0);
});
