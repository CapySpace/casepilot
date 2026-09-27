import { describe, expect, it } from "vitest";

import { adminClient, signedInUser } from "../support/clients";
import { attemptInvite, inviteByEmail } from "../support/invitations";
import { createProject } from "../support/projects";

describe("issuing an Invitation", () => {
  it("lets an Owner invite an address, recording who invited them", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);

    const { tokenHash } = await inviteByEmail(anna, project, "peter@example.com");

    const { data } = await anna.client
      .from("project_invitations")
      .select("email, status, invited_by, accepted_at")
      .eq("token_hash", tokenHash)
      .single();

    expect(data).toEqual({
      email: "peter@example.com",
      status: "pending",
      invited_by: anna.id,
      accepted_at: null,
    });
  });

  it("stores the address lower-cased, and refuses one that is not", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);

    const { error } = await attemptInvite(anna, project, "peter@example.com", {
      email: "Peter@Example.com",
    });

    expect(error?.message).toContain("project_invitations_email_lower_case");
  });

  it("refuses a second live Invitation for the same address", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    await inviteByEmail(anna, project, "peter@example.com");

    const { error } = await attemptInvite(anna, project, "peter@example.com");

    expect(error?.code).toBe("23505");
    expect(error?.message).toContain("project_invitations_one_pending_per_email");
  });

  it("allows the same address in two different Projects", async () => {
    const anna = await signedInUser();
    const one = await createProject(anna, "One");
    const two = await createProject(anna, "Two");

    await inviteByEmail(anna, one, "peter@example.com");
    const second = await inviteByEmail(anna, two, "peter@example.com");

    expect(second.tokenHash).toBeTruthy();
  });

  it("refuses an Invitation to a Project the caller does not own", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna);

    const { error } = await attemptInvite(peter, project, "stranger@example.com");

    expect(error?.code).toBe("42501");
  });

  it("refuses an Invitation attributed to somebody else", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna);

    const { error } = await attemptInvite(anna, project, "stranger@example.com", {
      invited_by: peter.id,
    });

    expect(error?.code).toBe("42501");
  });
});

describe("reading Invitations", () => {
  it("shows an Owner their own Project's Invitations", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    await inviteByEmail(anna, project, "peter@example.com");

    const { data } = await anna.client.from("project_invitations").select("email");

    expect(data).toEqual([{ email: "peter@example.com" }]);
  });

  it("hides them from everybody else, including the person invited", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna);
    const { tokenHash } = await inviteByEmail(anna, project, peter.email);

    const { data: byHash } = await peter.client
      .from("project_invitations")
      .select("email, project_id")
      .eq("token_hash", tokenHash);
    const { data: byAddress } = await peter.client
      .from("project_invitations")
      .select("email")
      .eq("email", peter.email);

    // Not even their own Invitation: reading it by address would let anybody ask which Projects an
    // address has been invited to. The link is spent through accept_invitation instead.
    expect(byHash).toEqual([]);
    expect(byAddress).toEqual([]);
  });
});

describe("cancelling an Invitation", () => {
  it("lets the Owner cancel a pending one", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const { tokenHash } = await inviteByEmail(anna, project, "peter@example.com");

    const { error } = await anna.client
      .from("project_invitations")
      .update({ status: "cancelled" })
      .eq("token_hash", tokenHash);
    expect(error).toBeNull();

    const { data } = await anna.client
      .from("project_invitations")
      .select("status")
      .eq("token_hash", tokenHash)
      .single();
    expect(data).toEqual({ status: "cancelled" });
  });

  it("does not let an Owner mark one accepted by hand", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const { tokenHash } = await inviteByEmail(anna, project, "peter@example.com");

    // Accepting is accept_invitation's business, and it writes a Membership in the same breath. An
    // Owner who could flip the status directly could record a Membership that does not exist.
    const { error } = await anna.client
      .from("project_invitations")
      .update({ status: "accepted" })
      .eq("token_hash", tokenHash);

    expect(error?.code).toBe("42501");
  });

  it("frees the address to be invited again", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const first = await inviteByEmail(anna, project, "peter@example.com");
    await anna.client
      .from("project_invitations")
      .update({ status: "cancelled" })
      .eq("token_hash", first.tokenHash);

    const second = await inviteByEmail(anna, project, "peter@example.com");

    expect(second.tokenHash).not.toBe(first.tokenHash);
  });

  it("refuses a cancellation by anybody but the Owner", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna);
    const { tokenHash } = await inviteByEmail(anna, project, "peter@example.com");

    await peter.client
      .from("project_invitations")
      .update({ status: "cancelled" })
      .eq("token_hash", tokenHash);

    const { data } = await anna.client
      .from("project_invitations")
      .select("status")
      .eq("token_hash", tokenHash)
      .single();
    expect(data).toEqual({ status: "pending" });
  });
});

describe("a Project that goes away", () => {
  it("takes its Invitations and Memberships with it", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    await inviteByEmail(anna, project, "peter@example.com");

    // Nothing in this phase deletes a Project — there is no delete policy, so no User can — but the
    // foreign keys say what happens when something eventually does, and nothing should outlive the
    // Project it belonged to. Asserted through the administrative client because a constraint is not
    // a policy: this is the one kind of question a signed-in User cannot ask.
    const admin = adminClient();
    const { error } = await admin.from("projects").delete().eq("id", project);
    expect(error).toBeNull();

    const { data: invitations } = await admin
      .from("project_invitations")
      .select("id")
      .eq("project_id", project);
    const { data: memberships } = await admin
      .from("project_members")
      .select("id")
      .eq("project_id", project);

    expect(invitations).toEqual([]);
    expect(memberships).toEqual([]);
  });
});
