import { expect, test } from "@playwright/test";

import { AUTHENTICATED_HOME } from "@/lib/auth/routes";

import { formError, signIn } from "../support/flows";
import { createVerifiedUser, revokeSessionsFor } from "../support/users";

/**
 * A session that stops working mid-task should say so.
 *
 * A genuine expiry takes an hour, so these end the session at the provider instead. What the User
 * sees is the same either way: a browser still holding a token the provider no longer honours.
 */
test("a User whose session has ended is told, not just bounced", async ({ page }) => {
  const user = await createVerifiedUser();
  await signIn(page, user);
  await expect(page).toHaveURL(AUTHENTICATED_HOME);

  await revokeSessionsFor(user);
  await page.goto(AUTHENTICATED_HOME);

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(formError(page)).toContainText("Your session has ended");
});

/**
 * The other half of the same criterion. Somebody who simply is not signed in has lost nothing, and
 * telling them their session ended would be a lie about their own history.
 */
test("a visitor who was never signed in is not told anything expired", async ({ page }) => {
  await page.goto(AUTHENTICATED_HOME);

  await expect(page).toHaveURL("/sign-in");
  await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
});

test("signing out is not reported as an expiry", async ({ page }) => {
  const user = await createVerifiedUser();
  await signIn(page, user);
  await expect(page).toHaveURL(AUTHENTICATED_HOME);

  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL("/sign-in");
  await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
});

/**
 * Being told the session ended must not become a dead end: the sign-in form still works from
 * there, and signing in again lands where it always does.
 */
test("signing in again from the expiry message works", async ({ page }) => {
  const user = await createVerifiedUser();
  await signIn(page, user);
  // Wait for the browser to actually hold a session before ending it, or the revocation lands
  // first and the session it was meant to kill is created afterwards.
  await expect(page).toHaveURL(AUTHENTICATED_HOME);

  await revokeSessionsFor(user);
  await page.goto(AUTHENTICATED_HOME);
  await expect(formError(page)).toContainText("Your session has ended");

  await page.getByLabel("Work Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(AUTHENTICATED_HOME);
  await expect(page.getByText(user.email)).toBeVisible();
});

/*
 * On renewal, which this suite cannot demonstrate.
 *
 * "Access is renewed silently in the background" is the provider's rotating refresh token, carried
 * back onto the response by `createProxyClient`. A token lives an hour, so a test of it would
 * either sleep for one or fake the clock, and neither is worth having.
 *
 * It was verified by hand instead: with `jwt_expiry` temporarily set to 5 seconds and the stack
 * restarted, a signed-in User was still working after two full token lifetimes, with no sign-in in
 * between. The config change was not committed — `jwt_expiry` is 3600, the provider default the
 * spec selected.
 */
