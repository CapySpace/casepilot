import { expect, test } from "@playwright/test";

import { signedInUser } from "../support/clients";
import { signInAndLand } from "../support/flows";
import { createProject, projectWithMember } from "../support/projects";

/**
 * Who is in a Project.
 *
 * The list is read through `project_people`, which is the only way a name and an address are available
 * at all: `profiles` is readable only by its own User and holds no email, and `auth.users` is readable
 * by nobody. So these tests are also what proves that function is wired in — the direct-API suite
 * proves what it refuses.
 */

test("everybody in the Project is listed, to everybody in the Project", async ({ browser, page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking App");
  const thisYear = new Date().getFullYear();

  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}/members`);

  const joined = new RegExp(`\\d{1,2} \\w+ ${thisYear}`);

  const owner = page.getByRole("row").filter({ hasText: anna.email });
  await expect(owner).toContainText(anna.fullName);
  await expect(owner).toContainText("Owner");
  // The Joined *cell*, and visibly. Asserting on the row would pass on the copy of the date that the
  // narrow-screen layout keeps hidden inside the name cell, which is not the column under test. Found by
  // what it contains, because the Owner's view has a trailing actions column and "the last cell" moved.
  const joinedCell = owner.getByRole("cell").filter({ hasText: joined });
  await expect(joinedCell).toBeVisible();
  await expect(joinedCell).toHaveText(joined);

  const member = page.getByRole("row").filter({ hasText: peter.email });
  await expect(member).toContainText(peter.fullName);
  await expect(member).toContainText("Member");
  await expect(member.getByRole("cell").filter({ hasText: joined })).toHaveText(joined);

  // Not an Owner-only page: the colleague who was invited sees the same list.
  const theirContext = await browser.newContext();
  const theirPage = await theirContext.newPage();
  await signInAndLand(theirPage, peter);
  await theirPage.goto(`/projects/${project}/members`);

  await expect(theirPage.getByRole("row").filter({ hasText: anna.email })).toContainText("Owner");
  await expect(theirPage.getByRole("row").filter({ hasText: peter.email })).toContainText("Member");
  await theirContext.close();
});

test("the Owner comes first, so who runs the Project is the first thing read", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking App");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/members`);

  await expect(page.getByRole("cell", { name: /Owner|Member/ })).toHaveText(["Owner", "Member"]);
});

test("a Project of one says so without looking broken", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Solo Project");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/members`);

  await expect(page.getByRole("row").filter({ hasText: anna.email })).toContainText("Owner");
  await expect(page.getByText("1 member")).toBeVisible();
});

test("on a narrow screen the joined date moves into the row rather than off it", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking App");
  await signInAndLand(page, anna);

  // Narrower than DESIGN.md §5's mobile boundary, where the table drops its last column rather than
  // scrolling sideways.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/projects/${project}/members`);

  await expect(page.getByRole("columnheader", { name: "Joined" })).toBeHidden();
  await expect(
    page.getByRole("row").filter({ hasText: peter.email }).getByText(/^Joined /),
  ).toBeVisible();
});

test("the sidebar leads to the Members list and says you are on it", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}`);

  const sidebar = page.getByRole("complementary");
  await sidebar.getByRole("link", { name: "Members" }).click();

  await expect(page).toHaveURL(`/projects/${project}/members`);
  await expect(sidebar.getByRole("link", { name: "Members" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("a non-member finds nothing at the Members URL", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await createProject(anna, "Anna's Secret Project");
  await signInAndLand(page, peter);

  const response = await page.goto(`/projects/${project}/members`);

  expect(response?.status()).toBe(404);
  await expect(page.getByText(anna.email)).toHaveCount(0);
});
