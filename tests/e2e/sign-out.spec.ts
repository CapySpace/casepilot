import { expect, test, type Page } from "@playwright/test";

import { AUTHENTICATED_HOME } from "@/lib/auth/routes";

import { signIn, signOut } from "../support/flows";
import { createVerifiedUser } from "../support/users";

async function signedIn(page: Page) {
  const user = await createVerifiedUser();
  await signIn(page, user);
  await expect(page).toHaveURL(AUTHENTICATED_HOME);
  return user;
}

test("a signed-in User can sign out and is returned to sign-in", async ({ page }) => {
  await signedIn(page);

  await signOut(page);
});

test("the back button does not return a signed-out User to authenticated content", async ({
  page,
}) => {
  const user = await signedIn(page);
  await expect(page.getByText(user.email)).toBeVisible();

  await signOut(page);
  await page.goBack();

  await expect(page).toHaveURL("/sign-in");
  await expect(page.getByText(user.email)).toHaveCount(0);
});

/*
 * On the guarantee behind the test above.
 *
 * Two different caches could replay the authenticated page. Going back after a client-side sign-out
 * is served from Next's router cache, which `revalidatePath` in the sign-out action clears — that
 * is the path this test drives. If the client bundle never loaded, sign-out is a full page load and
 * going back is a cross-document traversal, served from the browser's own back/forward cache, which
 * `revalidatePath` cannot reach; there, `no-store` is what stops it.
 *
 * Nothing in this repo sets that header, and nothing should: `/` is dynamic, and Next.js already
 * responds `private, no-cache, no-store, max-age=0, must-revalidate`. Setting it in the proxy was
 * tried and reverted — it replaced that with a strictly weaker value. Verified against a production
 * build; the dev server sends `no-cache` instead, so this is not assertable from this suite.
 */

test("after signing out, a protected URL is unreachable", async ({ page }) => {
  await signedIn(page);
  await signOut(page);

  await page.goto(AUTHENTICATED_HOME);

  await expect(page).toHaveURL("/sign-in");
});

/**
 * The difference between removing the session and merely clearing the interface.
 *
 * Sign-out ends the session at the provider, so the tokens the browser was holding are dead rather
 * than just discarded. Restoring them is the only way to tell the two apart, and this is the only
 * test that can: confirmed by making sign-out delete the cookies without telling the provider,
 * whereupon this fails and the other sign-out tests still pass.
 *
 * Note what it does not prove. The access token stays signature-valid until it expires, so the
 * proxy's local claims check waves it through — it is the Data Access Layer asking Supabase that
 * turns it away. ADR-0002's two layers, doing the two different jobs it says they do.
 */
test("the session is revoked, not just cleared from the browser", async ({ page, context }) => {
  await signedIn(page);

  const signedInCookies = await context.cookies();
  // Guards this test's own premise, not the product's behaviour. If the session ever stops being
  // carried in cookies there would be nothing to replay, and the test would pass without having
  // tested anything.
  expect(signedInCookies.length).toBeGreaterThan(0);

  await signOut(page);

  await context.addCookies(signedInCookies);
  await page.goto(AUTHENTICATED_HOME);

  // Sent back to sign-in, and told why: replaying a dead session is a session that has ended, and
  // the access token stays signature-valid long enough for this to be the Data Access Layer's
  // catch rather than the proxy's.
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.locator("form").getByRole("alert")).toContainText("Your session has ended");
});
