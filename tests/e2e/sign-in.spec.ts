import { expect, test, type Page } from "@playwright/test";

import { createUnverifiedUser, createVerifiedUser } from "../support/users";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Work Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

// Scoped to the form: Next.js's own route announcer is also a live region, so an unscoped
// `getByRole("alert")` matches two things and resolves to whichever happens to be there.
function errorOn(page: Page) {
  return page.locator("form").getByRole("alert");
}

test("a verified User signs in and lands in the authenticated area", async ({ page }) => {
  const user = await createVerifiedUser();

  await signIn(page, user.email, user.password);

  await expect(page).toHaveURL("/");
  // Whose session is active has to be legible, not inferred — this is a shared-machine problem.
  await expect(page.getByText(user.email)).toBeVisible();
});

test("a signed-in User can still reach sign-in, to come back as somebody else", async ({
  page,
}) => {
  const user = await createVerifiedUser();
  await signIn(page, user.email, user.password);
  await expect(page).toHaveURL("/");

  await page.goto("/sign-in");

  await expect(page).toHaveURL("/sign-in");
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("a wrong password is refused without saying whether the address exists", async ({ page }) => {
  const user = await createVerifiedUser();

  await signIn(page, user.email, "notTheirPassword9");
  await expect(page).toHaveURL("/sign-in");
  const wrongPassword = await errorOn(page).textContent();

  await signIn(page, `nobody-${Date.now()}@example.com`, "notTheirPassword9");
  await expect(page).toHaveURL("/sign-in");
  const unknownAddress = await errorOn(page).textContent();

  // The assertion that matters: a registered address and one that has never been seen are
  // indistinguishable. Otherwise the form becomes a way to discover who has a login.
  expect(wrongPassword).toBe(unknownAddress);
  expect(wrongPassword).not.toContain(user.email);
});

test("an unverified User cannot sign in", async ({ page }) => {
  const user = await createUnverifiedUser();

  await signIn(page, user.email, user.password);

  await expect(page).toHaveURL("/sign-in");
  await expect(errorOn(page)).toContainText("Confirm your email address");
});

test("a signed-out visitor opening a protected page is sent to sign-in", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL("/sign-in");
});

test("the redirect happens before any protected content is sent", async ({ page }) => {
  // Landing on /sign-in is not enough: a page that renders and *then* redirects has already put
  // the content on the wire. Asking for it without following the redirect is the only way to see
  // the difference.
  const response = await page.request.get("/", { maxRedirects: 0 });

  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);
  expect(response.headers()["location"]).toContain("/sign-in");
  expect(await response.text()).not.toContain("You are signed in");
});

test("a route nobody has declared public is protected by default", async ({ page }) => {
  // Not a real route. The point is that default-deny sends it to sign-in rather than letting the
  // request reach a page that might one day exist there and forget to guard itself.
  await page.goto("/projects/8f2c/cases");

  await expect(page).toHaveURL("/sign-in");
});
