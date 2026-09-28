import { expect, test } from "@playwright/test";

import { signedInUser } from "../support/clients";
import { signInAndLand } from "../support/flows";
import { createProject, projectWithMember } from "../support/projects";

/**
 * Inside a Project: the shell, the overview, and the settings an Owner may change.
 *
 * The URL is the whole of "which Project am I in" — there is no stored current Project — so these
 * tests navigate by URL as freely as a User would by bookmark.
 */

test("the overview names the Project and is honest about what is not here yet", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking Application");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}`);

  await expect(page.getByRole("heading", { level: 1, name: "Mobile Banking Application" })).toBeVisible();
  await expect(page.getByText("2 members")).toBeVisible();
  await expect(page.getByText(new RegExp(`Created \\d{1,2} \\w+ ${new Date().getFullYear()}`))).toBeVisible();
  await expect(page.getByText(/Builds and test cases arrive next/)).toBeVisible();
});

test("the overview shows a description when there is one, and does not invent one when there is not", async ({
  page,
}) => {
  const anna = await signedInUser();
  const described = await createProject(anna, "Described", "Nightly regression runs.");
  const bare = await createProject(anna, "Bare");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${described}`);
  await expect(page.getByText("Nightly regression runs.")).toBeVisible();

  await page.goto(`/projects/${bare}`);
  await expect(page.getByText("No description yet")).toBeVisible();
});

test("the sidebar sections the Project and its navigation", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}`);
  const sidebar = page.getByRole("complementary");

  // "PROJECT", not "WORKSPACE": the design predates the glossary, which retired that word.
  await expect(sidebar.getByText("Project", { exact: true })).toBeVisible();
  await expect(sidebar.getByText("Workspace", { exact: true })).toHaveCount(0);
  await expect(sidebar.getByText("Navigation", { exact: true })).toBeVisible();

  // The page you are on is marked, so the sidebar answers "where am I" and not just "where could I go".
  await expect(sidebar.getByRole("link", { name: "Overview" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await sidebar.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(`/projects/${project}/settings`);
  await expect(sidebar.getByRole("link", { name: "Settings" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("the switcher moves between Projects, and the URL is the only thing that remembers", async ({
  page,
}) => {
  const anna = await signedInUser();
  const banking = await createProject(anna, "Mobile Banking App");
  const commerce = await createProject(anna, "E-Commerce Platform");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${banking}`);
  const switcher = page.getByRole("complementary").getByRole("group");
  await switcher.getByText("Mobile Banking App").click();
  await switcher.getByRole("link", { name: "E-Commerce Platform" }).click();

  await expect(page).toHaveURL(`/projects/${commerce}`);
  await expect(page.getByRole("heading", { level: 1, name: "E-Commerce Platform" })).toBeVisible();

  // Nothing was stored: the other Project is exactly where it was, reachable by its own URL.
  await page.goto(`/projects/${banking}`);
  await expect(page.getByRole("heading", { level: 1, name: "Mobile Banking App" })).toBeVisible();
});

test("a Project URL works in a second tab, and in a colleague's hands", async ({
  browser,
  page,
}) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const shared = await projectWithMember(anna, peter, "Mobile Banking App");
  const other = await createProject(anna, "E-Commerce Platform");
  await signInAndLand(page, anna);

  // Two Projects at once. Nothing stores "the Project I am in", so neither tab can change what the
  // other is looking at — the trap a persisted current-Project would have set.
  const secondTab = await page.context().newPage();
  await page.goto(`/projects/${shared}`);
  await secondTab.goto(`/projects/${other}`);

  await expect(page.getByRole("heading", { level: 1, name: "Mobile Banking App" })).toBeVisible();
  await expect(
    secondTab.getByRole("heading", { level: 1, name: "E-Commerce Platform" }),
  ).toBeVisible();
  await secondTab.close();

  // The same URL, pasted to a fellow Member, opens the same Project.
  const theirContext = await browser.newContext();
  const theirPage = await theirContext.newPage();
  await signInAndLand(theirPage, peter);
  await theirPage.goto(`/projects/${shared}`);

  await expect(
    theirPage.getByRole("heading", { level: 1, name: "Mobile Banking App" }),
  ).toBeVisible();
  await theirContext.close();
});

test("an Owner renames their Project", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App", "The old description.");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/settings`);
  await page.getByLabel("Project Name").fill("Mobile Banking Application");
  await page.getByLabel("Description").fill("Testing for the mobile banking system.");
  await page.getByRole("button", { name: "Save Changes" }).click();

  await expect(page.getByText("Project updated")).toBeVisible();

  // Reloaded, so the value comes from the database rather than from the box this test typed into.
  await page.reload();
  await expect(page.getByLabel("Project Name")).toHaveValue("Mobile Banking Application");
  await expect(page.getByLabel("Description")).toHaveValue(
    "Testing for the mobile banking system.",
  );

  // And it is the Project that changed, not just the form: the name follows it everywhere.
  await page.goto(`/projects/${project}`);
  await expect(page.getByRole("heading", { level: 1, name: "Mobile Banking Application" })).toBeVisible();
  await expect(page.getByText("Testing for the mobile banking system.")).toBeVisible();

  await page.goto("/projects");
  await expect(
    page.getByRole("listitem").filter({ hasText: "Mobile Banking Application" }),
  ).toBeVisible();
});

test("a rejected edit changes nothing", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/settings`);
  await page.getByLabel("Project Name").fill("   ");
  await page.getByRole("button", { name: "Save Changes" }).click();

  await expect(page.getByText("Give the project a name.")).toBeVisible();

  await page.goto(`/projects/${project}`);
  await expect(page.getByRole("heading", { level: 1, name: "Mobile Banking App" })).toBeVisible();
});

test("a rejected edit is refused by the action too, with the client bundle switched off", async ({
  browser,
}) => {
  // With JavaScript the form refuses first, so the action's copy of the rules is never reached from
  // the interface — and the action is what protects a direct POST. Turning the bundle off posts the
  // form natively and drives the server's half.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}/settings`);

  await page.getByLabel("Project Name").fill("   ");
  await page.getByRole("button", { name: "Save Changes" }).click();

  await expect(page.getByText("Give the project a name.")).toBeVisible();

  await page.goto(`/projects/${project}`);
  await expect(page.getByRole("heading", { level: 1, name: "Mobile Banking App" })).toBeVisible();

  await context.close();
});

test("a Member sees the Project and no way to change it", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking App");
  await signInAndLand(page, peter);

  await page.goto(`/projects/${project}/settings`);

  // Absent, not disabled. A control you cannot use is worse than one that is not there.
  await expect(page.getByLabel("Project Name")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save Changes" })).toHaveCount(0);
  await expect(page.getByText(/Only the project owner can change/)).toBeVisible();
});

test("a non-member finds nothing at either Project URL", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await createProject(anna, "Anna's Secret Project");
  await signInAndLand(page, peter);

  const overview = await page.goto(`/projects/${project}`);
  expect(overview?.status()).toBe(404);

  const settings = await page.goto(`/projects/${project}/settings`);
  expect(settings?.status()).toBe(404);
  await expect(page.getByText("Anna's Secret Project")).toHaveCount(0);
});
