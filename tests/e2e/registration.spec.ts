import { expect, test, type Page } from "@playwright/test";

import { TERMS_VERSION } from "@/lib/auth/terms";

import { signIn } from "../support/flows";
import {
  createVerifiedUser,
  emailsSentTo,
  newEmail,
  NoSuchUserError,
  readProfile,
} from "../support/users";

const PASSWORD = "correcthorse1";

type Registration = {
  fullName?: string;
  email?: string;
  password?: string;
  acceptTerms?: boolean;
};

async function register(page: Page, fields: Registration = {}) {
  const {
    fullName = "Alexandra Vance",
    email = newEmail(),
    password = PASSWORD,
    acceptTerms = true,
  } = fields;

  await page.goto("/sign-up");
  await page.getByLabel("Full Name").fill(fullName);
  await page.getByLabel("Work Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  if (acceptTerms) await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create Account" }).click();

  return { fullName, email, password };
}

test("a stranger registers and is told to check their email", async ({ page }) => {
  const { email } = await register(page);

  await expect(page).toHaveURL(/\/check-email/);
  await expect(page.getByText(email)).toBeVisible();
});

test("the check-email page survives a refresh", async ({ page }) => {
  const { email } = await register(page);
  await expect(page).toHaveURL(/\/check-email/);

  await page.reload();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});

test("their name and their agreement are recorded", async ({ page }) => {
  const { fullName, email } = await register(page);
  await expect(page).toHaveURL(/\/check-email/);

  const profile = await readProfile(email);

  expect(profile.full_name).toBe(fullName);
  expect(profile.terms_version).toBe(TERMS_VERSION);
  expect(Date.parse(profile.terms_accepted_at)).toBeLessThanOrEqual(Date.now());
});

test("a registered but unverified User still cannot sign in", async ({ page }) => {
  const { email, password } = await register(page);
  await expect(page).toHaveURL(/\/check-email/);

  await signIn(page, { email, password });

  await expect(page).toHaveURL("/sign-in");
  await expect(page.locator("form").getByRole("alert")).toContainText("Confirm your email address");
});

test.describe("validation", () => {
  test("rejects a missing email address", async ({ page }) => {
    await register(page, { email: "" });

    await expect(page).toHaveURL("/sign-up");
    await expect(page.getByText("Enter your work email address.")).toBeVisible();
  });

  test("rejects a malformed email address", async ({ page }) => {
    await register(page, { email: "alexandra-at-company" });

    await expect(page).toHaveURL("/sign-up");
    await expect(page.getByText("That does not look like an email address.")).toBeVisible();
  });

  test("rejects a password that fails the rule", async ({ page }) => {
    await register(page, { password: "short1" });

    await expect(page).toHaveURL("/sign-up");
    await expect(page.getByText(/Your password must be at least 8 characters/)).toBeVisible();
  });

  test("rejects a missing name", async ({ page }) => {
    await register(page, { fullName: "" });

    await expect(page).toHaveURL("/sign-up");
    await expect(page.getByText("Enter your full name.")).toBeVisible();
  });

  test("will not create a User without agreement to the terms", async ({ page }) => {
    const { email } = await register(page, { acceptTerms: false });

    await expect(page).toHaveURL("/sign-up");
    await expect(
      page.getByText("Agree to the Terms of Service and Privacy Policy to continue."),
    ).toBeVisible();
    await expect(readProfile(email)).rejects.toThrow(NoSuchUserError);
  });

  test("keeps what they typed when something is rejected", async ({ page }) => {
    const { fullName, email } = await register(page, { password: "short1" });

    await expect(page).toHaveURL("/sign-up");
    await expect(page.getByLabel("Full Name")).toHaveValue(fullName);
    await expect(page.getByLabel("Work Email")).toHaveValue(email);
  });
});

test("the password rule answers as they type, without a round trip", async ({ page }) => {
  await page.goto("/sign-up");
  const rule = page.locator("#password-rule");

  await expect(rule).toHaveText(/At least 8 characters/);

  await page.getByLabel("Password", { exact: true }).fill("short");
  await expect(rule).toHaveText(/At least 8 characters/);

  await page.getByLabel("Password", { exact: true }).fill("longenoughbutnodigits");
  await expect(rule).toHaveText(/At least 8 characters/);

  await page.getByLabel("Password", { exact: true }).fill("correcthorse1");
  await expect(rule).toHaveText(/Password meets the requirements/);

  // Still on the form: nothing was submitted to learn any of that.
  await expect(page).toHaveURL("/sign-up");
});

test("the stated rule is the rule the provider enforces", async ({ page }) => {
  // The shortest password the form says it will take. If the copy and the provider's policy ever
  // drift apart, this is where it shows: the form would accept it and the API would refuse.
  const { email } = await register(page, { password: "abcdefg1" });

  await expect(page).toHaveURL(/\/check-email/);
  await expect(page.getByText(email)).toBeVisible();
});

/**
 * The anti-enumeration property, and the reason this ticket exists in the shape it does.
 *
 * A form that answers differently for an address that is already registered is a way of discovering
 * which of somebody's colleagues have logins. CasePilot holds a company's defect data, so that is a
 * real leak, not a theoretical one.
 */
test("registering an address that already exists discloses nothing", async ({ page }) => {
  const existing = await createVerifiedUser();
  const before = await emailsSentTo(existing.email);

  await register(page, { email: existing.email });
  // Auto-waits, and is the assertion with the teeth: surfacing the provider's `user_already_exists`
  // would leave us on /sign-up showing an error, and this fails.
  await expect(page).toHaveURL(/\/check-email/);
  const duplicateText = await page.locator("main").innerText();

  const fresh = newEmail();
  await register(page, { email: fresh });
  await expect(page).toHaveURL(/\/check-email/);
  const freshText = await page.locator("main").innerText();

  // The two pages differ only where they echo the address back, so compare with that taken out.
  expect(duplicateText.replace(existing.email, "…")).toBe(freshText.replace(fresh, "…"));

  // Saying the same thing but quietly emailing the existing User would still disclose, to them.
  expect(await emailsSentTo(existing.email)).toBe(before);
});

/**
 * The other half of the duplicate case, and the one where the criterion's "sends no email" is
 * literally false.
 *
 * An address that registered but never confirmed gets its confirmation email sent again. That is
 * the provider's behaviour and we keep it: the recipient is the person who asked for it in the
 * first place, the message says nothing about a second attempt, and an enumerator learns nothing
 * because the page they see is the same one either way. Recorded in ADR-0001 rather than worked
 * around.
 */
test("registering an unconfirmed address again also discloses nothing", async ({ page }) => {
  const first = await register(page);
  await expect(page).toHaveURL(/\/check-email/);
  const firstText = await page.locator("main").innerText();

  await register(page, { email: first.email });

  await expect(page).toHaveURL(/\/check-email/);
  expect(await page.locator("main").innerText()).toBe(firstText);
});
