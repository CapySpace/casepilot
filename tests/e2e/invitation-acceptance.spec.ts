import { expect, test, type Page } from "@playwright/test";

import { signedInUser } from "../support/clients";
import { confirmationUrl, signInAndLand, submitSignIn } from "../support/flows";
import { inviteByEmail } from "../support/invitations";
import { createProject, projectWithMember } from "../support/projects";
import { latestEmailTo, mintSignupToken, newEmail } from "../support/users";

/**
 * Spending an invitation link.
 *
 * The page is public, so most of these start signed out — which is the state the person it was written for
 * is actually in. Seeding uses the API as the Owner, because the Owner's own interface is ticket 05's and
 * already proven there.
 */

const PASSWORD = "correcthorse1";

function invitationUrl(token: string) {
  return `/invitations/${token}`;
}

async function registerFrom(page: Page, email: string, fullName = "Invited Tester") {
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/sign-up\?/);

  // Prefilled, because the invitation named the address.
  await expect(page.getByLabel("Work Email")).toHaveValue(email);

  await page.getByLabel("Full Name").fill(fullName);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Sign Up" }).click();
}

test("a signed-out visitor is told what they have been invited to, and how to take it up", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const { token } = await inviteByEmail(anna, project, "peter@example.com");

  await page.goto(invitationUrl(token));

  await expect(page.getByRole("heading", { name: "Mobile Banking App" })).toBeVisible();
  await expect(page.getByText(anna.fullName)).toBeVisible();
  await expect(page.getByText("peter@example.com")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("opening the page does not spend the token", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const { token } = await inviteByEmail(anna, project, peter.email);

  // Twice, as a prefetch or a mail scanner would.
  await page.goto(invitationUrl(token));
  await page.goto(invitationUrl(token));

  await signInAndLand(page, peter);
  await page.goto(invitationUrl(token));
  await page.getByRole("button", { name: /Join Mobile Banking App/ }).click();

  await expect(page).toHaveURL(new RegExp(`/projects/${project}$`));
});

test("signing in from an invitation comes back to it, and accepting joins the Project", async ({
  page,
}) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const { token } = await inviteByEmail(anna, project, peter.email);

  await page.goto(invitationUrl(token));
  await page.getByRole("link", { name: "Sign in" }).click();
  await submitSignIn(page, peter);

  // Back where they were going, not on somebody's idea of a home page.
  await expect(page).toHaveURL(invitationUrl(token));

  await page.getByRole("button", { name: /Join Mobile Banking App/ }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${project}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Mobile Banking App" })).toBeVisible();

  await page.goto("/projects");
  await expect(
    page.getByRole("listitem").filter({ hasText: "Mobile Banking App" }),
  ).toContainText("Member");
});

test("somebody with no account registers, confirms, and lands back on the invitation", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const invited = newEmail();
  const { token } = await inviteByEmail(anna, project, invited);

  await page.goto(invitationUrl(token));
  await registerFrom(page, invited);
  await expect(page).toHaveURL(/\/check-email/);

  // The long way round, through the email that actually arrived.
  const html = await latestEmailTo(invited);
  const link = /href="([^"]*\/auth\/confirm[^"]*)"/.exec(html)?.[1];
  expect(link).toBeTruthy();
  await page.goto(link!.replace(/&amp;/g, "&"));

  // The destination survived the round trip: registration remembered it, because the confirmation link
  // cannot carry it without the server deciding its own origin from a Host header.
  await expect(page).toHaveURL(invitationUrl(token));
  await expect(page.getByRole("button", { name: /Join Mobile Banking App/ })).toBeVisible();

  await page.getByRole("button", { name: /Join Mobile Banking App/ }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${project}$`));
});

test("one person's invitation is not handed to whoever confirms next on the same browser", async ({
  page,
}) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const invited = newEmail();
  const { token } = await inviteByEmail(anna, project, invited);

  // Somebody begins registering from the invitation, which remembers where to come back to…
  await page.goto(invitationUrl(token));
  await registerFrom(page, invited);
  await expect(page).toHaveURL(/\/check-email/);

  // …and then somebody else confirms their own registration in the same browser, as happens on a shared
  // machine. They must not be handed the invitation: it names a Project, an inviter and an address that
  // are none of their business, and they never held the token.
  const stranger = await mintSignupToken();
  await page.goto(confirmationUrl(stranger.tokenHash));
  await expect(page).toHaveURL("/projects");
  await expect(page.getByText("Mobile Banking App")).toHaveCount(0);

  // The invitation is still waiting for the person it was remembered for.
  const html = await latestEmailTo(invited);
  const link = /href="([^"]*\/auth\/confirm[^"]*)"/.exec(html)?.[1];
  await page.goto(link!.replace(/&amp;/g, "&"));

  await expect(page).toHaveURL(invitationUrl(token));
});

test("a spent link says so and creates no second Membership", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const { token } = await inviteByEmail(anna, project, peter.email);

  await signInAndLand(page, peter);
  await page.goto(invitationUrl(token));
  await page.getByRole("button", { name: /Join Mobile Banking App/ }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${project}$`));

  await page.goto(invitationUrl(token));

  await expect(page.getByText("This invitation has already been used.")).toBeVisible();
  await page.goto(`/projects/${project}/members`);
  await expect(page.getByRole("row").filter({ hasText: peter.email })).toHaveCount(1);
});

test("an expired link explains that it was time-limited", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const { token } = await inviteByEmail(anna, project, peter.email, { expiresInMs: -1000 });

  await signInAndLand(page, peter);
  await page.goto(invitationUrl(token));

  await expect(page.getByText(/This invitation has expired/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Join/ })).toHaveCount(0);

  await page.goto("/projects");
  await expect(page.getByText("You are not in any projects yet")).toBeVisible();
});

test("a cancelled link says it was cancelled", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const { token, tokenHash } = await inviteByEmail(anna, project, peter.email);
  await anna.client
    .from("project_invitations")
    .update({ status: "cancelled" })
    .eq("token_hash", tokenHash);

  await signInAndLand(page, peter);
  await page.goto(invitationUrl(token));

  await expect(page.getByText(/This invitation was cancelled/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Join/ })).toHaveCount(0);
});

test("a link addressed to somebody else names them, and offers a way to hand over", async ({
  page,
}) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const stranger = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  const { token } = await inviteByEmail(anna, project, peter.email);

  await signInAndLand(page, stranger);
  await page.goto(invitationUrl(token));

  await expect(page.getByText(new RegExp(`sent to ${peter.email}`))).toBeVisible();
  await expect(page.getByText(new RegExp(`signed in as ${stranger.email}`))).toBeVisible();
  await expect(page.getByRole("button", { name: /Join/ })).toHaveCount(0);

  // Signing out from here returns to this invitation's sign-in, so the right person can take over.
  await page.getByRole("button", { name: /Sign out and sign in as/ }).click();
  await expect(page).toHaveURL(`/sign-in?next=${encodeURIComponent(invitationUrl(token))}`);

  await submitSignIn(page, peter);
  await expect(page).toHaveURL(invitationUrl(token));
  await page.getByRole("button", { name: /Join Mobile Banking App/ }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${project}$`));
});

test("a token nobody issued says nothing about anybody", async ({ page }) => {
  await page.goto(`/invitations/${"a".repeat(43)}`);

  await expect(page.getByText(/This invitation link is not valid/)).toBeVisible();
});

test("somebody already in the Project is told so, and given the way in", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking App");
  // A second Invitation to somebody who is already in: reachable when they joined between the two events.
  const { token } = await inviteByEmail(anna, project, peter.email);

  await signInAndLand(page, peter);
  await page.goto(invitationUrl(token));
  await page.getByRole("button", { name: /Join Mobile Banking App/ }).click();

  // Said, not silently acted on: a page that quietly moves leaves somebody wondering whether they just
  // joined something twice.
  await expect(page.getByText("You are already a member of this project.")).toBeVisible();

  await page.getByRole("link", { name: /Open Mobile Banking App/ }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${project}$`));

  await page.goto(`/projects/${project}/members`);
  await expect(page.getByRole("row").filter({ hasText: peter.email })).toHaveCount(1);
});
