import { expect, test, type Page } from "@playwright/test";

import { hashInvitationToken } from "@/lib/projects/invitation-token";

import { signedInUser, type ActingUser } from "../support/clients";
import { signInAndLand } from "../support/flows";
import { inviteByEmail } from "../support/invitations";
import { createProject, projectWithMember } from "../support/projects";

/**
 * Issuing and managing Invitations, from the Members page.
 *
 * There is no mail delivery in this phase (ADR-0004), so what these tests check is that an Owner is
 * handed a working link and told plainly that sending it is their job. Accepting one is ticket 06 — so
 * where a test needs to know whether a link still *works*, it asks the database through the same
 * function the acceptance page will call.
 */

const LINK = /^http:\/\/localhost:3000\/invitations\/[A-Za-z0-9_-]{43}$/;

function invite(page: Page, email: string) {
  return page.getByLabel("Email Address").fill(email);
}

async function linkFrom(page: Page): Promise<string> {
  return page.getByRole("link", { name: /\/invitations\// }).innerText();
}

/** What the acceptance page will do with the token in the link. */
async function attemptAccept(person: ActingUser, link: string) {
  const token = link.split("/invitations/")[1];
  const { data } = await person.client.rpc("accept_invitation", {
    p_token_hash: hashInvitationToken(token),
  });

  return data?.[0]?.outcome as string | undefined;
}

test("an Owner invites a colleague and is handed the link to send", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}/members`);

  await invite(page, "peter@example.com");
  await page.getByRole("button", { name: "Create Invitation" }).click();

  // Named, and honest about who does the sending.
  await expect(page.getByText(/Invitation created for peter@example\.com/)).toBeVisible();
  await expect(page.getByText(/CasePilot does not email it/)).toBeVisible();
  await expect(page.getByText(LINK)).toBeVisible();

  const pending = page.getByRole("listitem").filter({ hasText: "peter@example.com" });
  await expect(pending).toContainText(anna.fullName);
  await expect(pending).toContainText(new RegExp(`Expires \\d{1,2} \\w+ ${new Date().getFullYear()}`));
});

test("the link is an absolute URL the Owner can paste anywhere", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}/members`);

  await invite(page, "peter@example.com");
  await page.getByRole("button", { name: "Create Invitation" }).click();

  // Built in the browser from its own origin, because the server refuses to trust a Host header.
  expect(await linkFrom(page)).toMatch(LINK);
});

test("an address typed in capitals is stored and shown in lower case", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}/members`);

  await invite(page, "Peter@Example.COM");
  await page.getByRole("button", { name: "Create Invitation" }).click();

  // One address, one spelling. The database refuses a row that is not lower-cased, and the unique index
  // that keeps one live Invitation per address would otherwise treat two capitalisations as two people.
  await expect(page.getByText(/Invitation created for peter@example\.com/)).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "peter@example.com" })).toHaveCount(1);
  // A regex, because `getByText` with a *string* matches case-insensitively — so the obvious spelling of
  // this assertion passes whatever the case, which is the one thing it exists to check.
  await expect(page.getByText(/Peter@Example\.COM/)).toHaveCount(0);
});

test("the same address cannot be invited twice while one is waiting", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}/members`);

  await invite(page, "peter@example.com");
  await page.getByRole("button", { name: "Create Invitation" }).click();
  await expect(page.getByText(/Invitation created/)).toBeVisible();

  await invite(page, "peter@example.com");
  await page.getByRole("button", { name: "Create Invitation" }).click();

  await expect(page.getByText(/peter@example\.com already has an invitation waiting/)).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "peter@example.com" })).toHaveCount(1);
});

test("somebody already in the Project cannot be invited again", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking App");
  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}/members`);

  await invite(page, peter.email.toUpperCase());
  await page.getByRole("button", { name: "Create Invitation" }).click();

  await expect(page.getByText(/is already a member of this project/)).toBeVisible();
});

test("an expired Invitation says so, and its address can be invited again", async ({ page }) => {
  const anna = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await inviteByEmail(anna, project, "peter@example.com", { expiresInMs: -1000 });
  await signInAndLand(page, anna);

  await page.goto(`/projects/${project}/members`);
  const stale = page.getByRole("listitem").filter({ hasText: "peter@example.com" });
  await expect(stale).toContainText("Expired");

  await invite(page, "peter@example.com");
  await page.getByRole("button", { name: "Create Invitation" }).click();

  await expect(page.getByText(/Invitation created for peter@example\.com/)).toBeVisible();
  const rows = page.getByRole("listitem").filter({ hasText: "peter@example.com" });
  await expect(rows).toHaveCount(1);
  await expect(rows).not.toContainText("Expired");
});

test("cancelling an Invitation stops its link working", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await createProject(anna, "Mobile Banking App");
  await signInAndLand(page, anna);
  await page.goto(`/projects/${project}/members`);

  await invite(page, peter.email);
  await page.getByRole("button", { name: "Create Invitation" }).click();
  const link = await linkFrom(page);

  await page
    .getByRole("listitem")
    .filter({ hasText: peter.email })
    .getByRole("button", { name: new RegExp(`Cancel the invitation to ${peter.email}`) })
    .click();
  // Behind a confirmation since ticket 07, like the other two destructive actions.
  await page.getByRole("button", { name: "Cancel invitation" }).click();

  await expect(page.getByText(/Invitation cancelled/)).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: peter.email })).toHaveCount(0);

  // And the Owner is no longer being handed a dead link to send. The panel above outlives the action
  // that produced it unless something says otherwise, which is exactly the trap: a live-looking link
  // directly beneath copy explaining that cancelling stops it working.
  await expect(page.getByText(/Invitation created for/)).toHaveCount(0);
  await expect(page.getByText(LINK)).toHaveCount(0);

  // Ticket 06 builds the page that spends a link; what matters here is that this one no longer can.
  expect(await attemptAccept(peter, link)).toBe("cancelled");
});

test("a Member sees the people and none of the Owner's controls", async ({ page }) => {
  const anna = await signedInUser();
  const peter = await signedInUser();
  const project = await projectWithMember(anna, peter, "Mobile Banking App");
  await inviteByEmail(anna, project, "stranger@example.com");
  await signInAndLand(page, peter);

  await page.goto(`/projects/${project}/members`);

  await expect(page.getByRole("row").filter({ hasText: anna.email })).toBeVisible();
  await expect(page.getByLabel("Email Address")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create Invitation" })).toHaveCount(0);
  // Not merely hidden: a Member cannot read the Invitation list at all, which the RLS suite proves.
  await expect(page.getByText("stranger@example.com")).toHaveCount(0);
});

test.describe("what the invite form refuses", () => {
  test("an address that is not one, answered as they type", async ({ page }) => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/members`);

    await invite(page, "peter");
    await page.getByLabel("Email Address").blur();

    await expect(page.getByText("That does not look like an email address.")).toBeVisible();
  });

  test("an empty address, with the client bundle switched off", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");
    await signInAndLand(page, anna);
    await page.goto(`/projects/${project}/members`);

    await page.getByRole("button", { name: "Create Invitation" }).click();

    await expect(
      page.getByText("Enter the email address of the person you want to invite."),
    ).toBeVisible();

    await context.close();
  });
});
