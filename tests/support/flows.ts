import { expect, type Page } from "@playwright/test";

/** The credentials a sign-in attempt is made with — a real User's, or a deliberately wrong pair. */
type Credentials = {
  email: string;
  password: string;
};

/** Drives the real sign-in form, the way a User would. */
export async function signIn(page: Page, { email, password }: Credentials) {
  await page.goto("/sign-in");
  await page.getByLabel("Work Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

/** Signs out from the authenticated area and waits to land back on sign-in. */
export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/sign-in");
}

/**
 * The error shown on a form, scoped to it deliberately: Next.js's route announcer is also a live
 * region, so an unscoped `getByRole("alert")` matches two things and resolves to whichever is there.
 */
export function formError(page: Page) {
  return page.locator("form").getByRole("alert");
}
