import { expect, test, type Page } from "@playwright/test";

import { formError, signIn, signOut } from "../support/flows";
import {
  createVerifiedUser,
  emailsSentTo,
  latestEmailTo,
  mintRecoveryToken,
  newEmail,
} from "../support/users";

const NEW_PASSWORD = "brandnewhorse9";

function recoveryUrl(tokenHash: string) {
  const query = new URLSearchParams({
    token_hash: tokenHash,
    type: "recovery",
    next: "/reset-password",
  });
  return `/auth/confirm?${query}`;
}

async function requestReset(page: Page, email: string) {
  await page.goto("/forgot-password");
  await page.getByLabel("Work Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
}

async function chooseNewPassword(page: Page, password: string, confirmation = password) {
  await page.getByLabel("New password", { exact: true }).fill(password);
  await page.getByLabel("Confirm new password").fill(confirmation);
  await page.getByRole("button", { name: "Set new password" }).click();
}

test("a User recovers their password and signs in with the new one", async ({ page }) => {
  const user = await createVerifiedUser();

  await requestReset(page, user.email);
  await expect(page.getByRole("heading", { name: "Instructions sent" })).toBeVisible();

  await page.goto(recoveryUrl(await mintRecoveryToken(user.email)));
  await expect(page).toHaveURL("/reset-password");

  await chooseNewPassword(page, NEW_PASSWORD);
  await expect(page).toHaveURL("/");

  await signOut(page);
  await signIn(page, { email: user.email, password: NEW_PASSWORD });

  await expect(page).toHaveURL("/");
  await expect(page.getByText(user.email)).toBeVisible();
});

test("the old password stops working", async ({ page }) => {
  const user = await createVerifiedUser();
  await page.goto(recoveryUrl(await mintRecoveryToken(user.email)));
  await chooseNewPassword(page, NEW_PASSWORD);
  await expect(page).toHaveURL("/");
  await signOut(page);

  await signIn(page, user);

  await expect(page).toHaveURL("/sign-in");
  await expect(formError(page)).toContainText("do not match");
});

/**
 * The same property registration has, for the same reason: a form that answers differently for a
 * registered address is a way of discovering who has a login.
 */
test("the request form says the same thing whether or not the address is registered", async ({
  page,
}) => {
  const user = await createVerifiedUser();

  await requestReset(page, user.email);
  const registered = await page.locator("main").innerText();

  const stranger = newEmail();
  const before = await emailsSentTo(stranger);
  await requestReset(page, stranger);
  const unregistered = await page.locator("main").innerText();

  expect(registered).toBe(unregistered);
  // And nothing was sent to an address nobody has.
  expect(await emailsSentTo(stranger)).toBe(before);
});

test("the request form offers a way back to sign in", async ({ page }) => {
  await page.goto("/forgot-password");

  await page.getByRole("link", { name: "Back to sign in" }).click();

  await expect(page).toHaveURL("/sign-in");
});

test("a new password must be confirmed", async ({ page }) => {
  const user = await createVerifiedUser();
  await page.goto(recoveryUrl(await mintRecoveryToken(user.email)));

  await chooseNewPassword(page, NEW_PASSWORD, "somethingelse9");

  await expect(page).toHaveURL("/reset-password");
  await expect(page.getByText("Those two passwords are not the same")).toBeVisible();
});

test("the new password must meet the same rule as registration", async ({ page }) => {
  const user = await createVerifiedUser();
  await page.goto(recoveryUrl(await mintRecoveryToken(user.email)));

  const rule = page.locator("#password-rule");
  await expect(rule).toHaveText(/At least 8 characters/);
  await page.getByLabel("New password", { exact: true }).fill("short1");
  await expect(rule).toHaveText(/At least 8 characters/);
  await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
  await expect(rule).toHaveText(/Password meets the requirements/);

  await page.getByLabel("New password", { exact: true }).fill("short1");
  await chooseNewPassword(page, "short1");

  await expect(page).toHaveURL("/reset-password");
  await expect(page.getByText(/Your password must be at least 8 characters/)).toBeVisible();
});

test("an invalid reset link is explained", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=&type=recovery&next=/reset-password");

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(formError(page)).toContainText("That link is not valid");
});

test("an expired or tampered reset link is explained", async ({ page }) => {
  const user = await createVerifiedUser();
  const tokenHash = await mintRecoveryToken(user.email);

  await page.goto(recoveryUrl(`${tokenHash.slice(0, -8)}deadbeef`));

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(formError(page)).toContainText("expired or has already been used");
});

/**
 * An intercepted email is the threat this guards against: the link is worth nothing once used, so
 * whoever reads the inbox second gets nowhere.
 */
test("a used reset link cannot be replayed by somebody else", async ({ page, context }) => {
  const user = await createVerifiedUser();
  const tokenHash = await mintRecoveryToken(user.email);
  await page.goto(recoveryUrl(tokenHash));
  await chooseNewPassword(page, NEW_PASSWORD);
  await expect(page).toHaveURL("/");

  const thief = await context.browser()!.newContext();
  const thiefPage = await thief.newPage();
  await thiefPage.goto(recoveryUrl(tokenHash));

  await expect(thiefPage).toHaveURL(/\/sign-in/);
  await expect(formError(thiefPage)).toContainText("expired or has already been used");
  await thief.close();
});

test("landing on the form without following a link explains what to do", async ({ page }) => {
  await page.goto("/reset-password");

  await expect(page.getByRole("heading", { name: "That link cannot be used" })).toBeVisible();
  await page.getByRole("link", { name: "Request a new link" }).click();
  await expect(page).toHaveURL("/forgot-password");
});

/** The reset link really does arrive by email, and really does work. */
test("the link arrives by email and completes recovery", async ({ page }) => {
  const user = await createVerifiedUser();

  await requestReset(page, user.email);
  await expect(page.getByRole("heading", { name: "Instructions sent" })).toBeVisible();

  let html = "";
  await expect
    .poll(
      async () => {
        html = await latestEmailTo(user.email).catch(() => "");
        return html.length;
      },
      { message: `waiting for a reset email to reach ${user.email}` },
    )
    .toBeGreaterThan(0);

  const link = /href="([^"]*\/auth\/confirm[^"]*)"/.exec(html)?.[1];
  expect(link, "the email should carry a link to the confirmation endpoint").toBeTruthy();

  await page.goto(link!);
  await expect(page).toHaveURL("/reset-password");
  await chooseNewPassword(page, NEW_PASSWORD);

  await expect(page).toHaveURL("/");
});
