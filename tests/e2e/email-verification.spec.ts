import { expect, test } from "@playwright/test";

import { formError, signIn } from "../support/flows";
import { latestEmailTo, mintSignupToken, newEmail } from "../support/users";

function confirmationUrl(tokenHash: string, options: { type?: string; next?: string } = {}) {
  const { type = "signup", next } = options;
  const query = new URLSearchParams({ token_hash: tokenHash, type });
  if (next !== undefined) query.set("next", next);
  return `/auth/confirm?${query}`;
}

test("following the link verifies the address and signs the User in", async ({ page }) => {
  const { user, tokenHash } = await mintSignupToken();

  await page.goto(confirmationUrl(tokenHash));

  // Straight into the authenticated area — no sign-in step in between. That is the whole point:
  // registration and first use are one motion.
  await expect(page).toHaveURL("/");
  await expect(page.getByText(user.email)).toBeVisible();
});

test("the onward destination in the link is honoured", async ({ page }) => {
  const { tokenHash } = await mintSignupToken();

  await page.goto(confirmationUrl(tokenHash, { next: "/reset-password" }));

  // Ticket 06 builds that page; what matters here is that the handler took us to the destination
  // the link carried rather than to its default.
  await expect(page).toHaveURL("/reset-password");
});

/**
 * The link is a URL anybody can write, and its destination is a redirect target. Sending somebody
 * off-site after genuinely verifying them would be a persuasive piece of phishing: the first half
 * of it really is from CasePilot.
 */
test("a link cannot be made to redirect off the site", async ({ page }) => {
  const { tokenHash } = await mintSignupToken();

  await page.goto(confirmationUrl(tokenHash, { next: "//evil.example" }));

  await expect(page).toHaveURL("/");
});

test("once verified, the User can sign in normally", async ({ page }) => {
  const { user, tokenHash } = await mintSignupToken();
  await page.goto(confirmationUrl(tokenHash));
  await expect(page).toHaveURL("/");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/sign-in");
  await signIn(page, user);

  await expect(page).toHaveURL("/");
});

test("an invalid link is explained in plain language", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=&type=signup");

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(formError(page)).toContainText("That link is not valid");
});

test("a link of a type CasePilot never sends is refused", async ({ page }) => {
  const { tokenHash } = await mintSignupToken();

  await page.goto(confirmationUrl(tokenHash, { type: "magiclink" }));

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(formError(page)).toContainText("That link is not valid");
});

test("a tampered token is refused and explained", async ({ page }) => {
  const { tokenHash } = await mintSignupToken();

  await page.goto(confirmationUrl(`${tokenHash.slice(0, -8)}deadbeef`));

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(formError(page)).toContainText("expired or has already been used");
});

/**
 * The provider cannot tell a consumed token from an expired one — both come back `otp_expired`,
 * verified against the running stack — so this covers both criteria. What it proves either way is
 * that the token is spent: a second use gets nobody in.
 */
test("a consumed token cannot be replayed", async ({ page, context }) => {
  const { tokenHash } = await mintSignupToken();
  await page.goto(confirmationUrl(tokenHash));
  await expect(page).toHaveURL("/");

  // A different browser entirely: somebody who intercepted the email, not the person who used it.
  const thief = await context.browser()!.newContext();
  const thiefPage = await thief.newPage();
  await thiefPage.goto(confirmationUrl(tokenHash));

  await expect(thiefPage).toHaveURL(/\/sign-in/);
  await expect(formError(thiefPage)).toContainText("expired or has already been used");
  await thief.close();
});

/**
 * Story 19: a stale email in an inbox should not produce an alarming error. Somebody who has
 * already verified and is still signed in has nothing to fix, so the spent link simply takes them
 * where it was always going to take them.
 */
test("following an old link again after verifying is not alarming", async ({ page }) => {
  const { tokenHash } = await mintSignupToken();
  await page.goto(confirmationUrl(tokenHash));
  await expect(page).toHaveURL("/");

  await page.goto(confirmationUrl(tokenHash));

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "CasePilot" })).toBeVisible();
});

/**
 * The one test that goes the long way round.
 *
 * Everything else mints tokens administratively for speed. This one registers through the form,
 * reads the local mail catcher, and follows whatever link actually arrived — so that the template
 * committed in ticket 01, the address it points at, and this handler are proved to agree. Mocking
 * any part of that would leave the thing a User actually receives untested.
 */
test("registering really does send an email containing a working link", async ({ page }) => {
  const email = newEmail();

  await page.goto("/sign-up");
  await page.getByLabel("Full Name").fill("Alexandra Vance");
  await page.getByLabel("Work Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("correcthorse1");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page).toHaveURL(/\/check-email/);

  let html = "";
  await expect
    .poll(async () => {
      html = await latestEmailTo(email).catch(() => "");
      return html.length;
    }, { message: `waiting for a confirmation email to reach ${email}` })
    .toBeGreaterThan(0);

  const link = /href="([^"]*\/auth\/confirm[^"]*)"/.exec(html)?.[1];
  expect(link, "the email should carry a link to the confirmation endpoint").toBeTruthy();

  await page.goto(link!);

  await expect(page).toHaveURL("/");
  await expect(page.getByText(email)).toBeVisible();
});
