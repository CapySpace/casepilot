import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { hashInvitationToken, mintInvitationToken } from "@/lib/projects/invitation-token";

import { anonymousClient, signedInUser } from "../support/clients";
import { inviteByEmail } from "../support/invitations";
import { createProject } from "../support/projects";

/** What the acceptance page will call, with the raw token from the link. */
function accept(client: SupabaseClient, token: string) {
  return client.rpc("accept_invitation", { p_token_hash: hashInvitationToken(token) });
}

function preview(client: SupabaseClient, token: string) {
  return client.rpc("invitation_preview", { p_token_hash: hashInvitationToken(token) });
}

describe("previewing an Invitation", () => {
  it("tells a signed-out visitor holding the link what they have been invited to", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking Application");
    const { token } = await inviteByEmail(anna, project, "peter@example.com");

    const { data, error } = await preview(anonymousClient(), token);

    expect(error).toBeNull();
    expect(data).toEqual([
      {
        project_id: project,
        project_name: "Mobile Banking Application",
        invited_by_name: anna.fullName,
        email: "peter@example.com",
        state: "pending",
      },
    ]);
  });

  it("says nothing at all about a token it does not know", async () => {
    const { data, error } = await preview(anonymousClient(), mintInvitationToken().token);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("reports an expired Invitation as expired without changing it", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const { token, tokenHash } = await inviteByEmail(anna, project, "peter@example.com", {
      expiresInMs: -1000,
    });

    const { data } = await preview(anonymousClient(), token);
    expect(data?.[0]).toMatchObject({ state: "expired" });

    const { data: stored } = await anna.client
      .from("project_invitations")
      .select("status")
      .eq("token_hash", tokenHash)
      .single();
    expect(stored).toEqual({ status: "pending" });
  });

  it("reports a spent Invitation as accepted", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna);
    const { token } = await inviteByEmail(anna, project, peter.email);
    await accept(peter.client, token);

    const { data } = await preview(anonymousClient(), token);

    expect(data?.[0]).toMatchObject({ state: "accepted", project_name: "Mobile Banking App" });
  });

  it("reports a cancelled Invitation as cancelled", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const { token, tokenHash } = await inviteByEmail(anna, project, "peter@example.com");
    await anna.client
      .from("project_invitations")
      .update({ status: "cancelled" })
      .eq("token_hash", tokenHash);

    const { data } = await preview(anonymousClient(), token);

    expect(data?.[0]).toMatchObject({ state: "cancelled" });
  });
});

describe("accepting an Invitation", () => {
  it("creates the Membership and spends the Invitation", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna);
    const { token } = await inviteByEmail(anna, project, peter.email);

    const { data, error } = await accept(peter.client, token);

    expect(error).toBeNull();
    expect(data).toEqual([{ project_id: project, outcome: "accepted" }]);

    const { data: membership } = await peter.client
      .from("project_members")
      .select("role")
      .eq("project_id", project)
      .eq("user_id", peter.id)
      .single();
    expect(membership).toEqual({ role: "member" });

    const { data: invitation } = await anna.client
      .from("project_invitations")
      .select("status, accepted_at")
      .eq("project_id", project)
      .single();
    expect(invitation?.status).toBe("accepted");
    expect(invitation?.accepted_at).not.toBeNull();

    const { data: projects } = await peter.client.from("projects").select("id");
    expect(projects).toEqual([{ id: project }]);
  });

  it("cannot be spent twice", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna);
    const { token } = await inviteByEmail(anna, project, peter.email);
    await accept(peter.client, token);

    const { data } = await accept(peter.client, token);

    expect(data).toEqual([{ project_id: project, outcome: "used" }]);
    const { data: memberships } = await peter.client
      .from("project_members")
      .select("id")
      .eq("project_id", project)
      .eq("user_id", peter.id);
    expect(memberships).toHaveLength(1);
  });

  // What this can prove: two concurrent calls produce one Membership and one `used`. What it cannot:
  // that they genuinely overlapped inside the database — PostgREST may have serialised them, and the
  // test passes either way. The `for update` in accept_invitation is the mechanism; this is the
  // outcome it must produce, asserted at the only seam that can reach it.
  it("creates one Membership when two clicks race", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna);
    const { token } = await inviteByEmail(anna, project, peter.email);

    const outcomes = await Promise.all([accept(peter.client, token), accept(peter.client, token)]);

    expect(outcomes.map((result) => result.data?.[0]?.outcome).sort()).toEqual([
      "accepted",
      "used",
    ]);
    const { data: memberships } = await peter.client
      .from("project_members")
      .select("id")
      .eq("project_id", project)
      .eq("user_id", peter.id);
    expect(memberships).toHaveLength(1);
  });

  it("refuses somebody the Invitation was not addressed to", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const stranger = await signedInUser();
    const project = await createProject(anna);
    const { token } = await inviteByEmail(anna, project, peter.email);

    const { data } = await accept(stranger.client, token);

    expect(data).toEqual([{ project_id: null, outcome: "wrong_address" }]);
    const { data: projects } = await stranger.client.from("projects").select("id");
    expect(projects).toEqual([]);
  });

  it("matches the address without regard to case", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna);
    const { token } = await inviteByEmail(anna, project, peter.email.toUpperCase());

    const { data } = await accept(peter.client, token);

    expect(data).toEqual([{ project_id: project, outcome: "accepted" }]);
  });

  it("refuses an expired Invitation", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna);
    const { token } = await inviteByEmail(anna, project, peter.email, { expiresInMs: -1000 });

    const { data } = await accept(peter.client, token);

    expect(data).toEqual([{ project_id: null, outcome: "expired" }]);
    const { data: projects } = await peter.client.from("projects").select("id");
    expect(projects).toEqual([]);
  });

  it("refuses a cancelled Invitation", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna);
    const { token, tokenHash } = await inviteByEmail(anna, project, peter.email);
    await anna.client
      .from("project_invitations")
      .update({ status: "cancelled" })
      .eq("token_hash", tokenHash);

    const { data } = await accept(peter.client, token);

    expect(data).toEqual([{ project_id: null, outcome: "cancelled" }]);
  });

  it("says nothing about a token it does not know", async () => {
    const peter = await signedInUser();

    const { data } = await accept(peter.client, mintInvitationToken().token);

    expect(data).toEqual([{ project_id: null, outcome: "not_found" }]);
  });

  it("tells somebody already in the Project that they are", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const { token } = await inviteByEmail(anna, project, anna.email);

    const { data } = await accept(anna.client, token);

    expect(data).toEqual([{ project_id: project, outcome: "already_member" }]);
    const { data: memberships } = await anna.client
      .from("project_members")
      .select("role")
      .eq("project_id", project);
    expect(memberships).toEqual([{ role: "owner" }]);
  });

  it("is not available to a visitor with no session", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const { token } = await inviteByEmail(anna, project, "peter@example.com");

    const { error } = await accept(anonymousClient(), token);

    expect(error).not.toBeNull();
  });
});

describe("the membership predicates", () => {
  it("answer for a signed-in User", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna);

    // The positive half matters as much as the negative one: every policy in the phase calls these
    // through a policy qual, and a qual checks the function's ACL. Without this, "nobody may call
    // them" and "they were revoked from everybody, so every read is broken" look the same.
    expect((await anna.client.rpc("is_project_member", { p_project_id: project })).data).toBe(true);
    expect((await anna.client.rpc("is_project_owner", { p_project_id: project })).data).toBe(true);
    expect((await peter.client.rpc("is_project_member", { p_project_id: project })).data).toBe(
      false,
    );
  });

  it("are not callable by a visitor with no session", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const anon = anonymousClient();

    const asMember = await anon.rpc("is_project_member", { p_project_id: project });
    const asOwner = await anon.rpc("is_project_owner", { p_project_id: project });

    expect(asMember.error).not.toBeNull();
    expect(asOwner.error).not.toBeNull();
  });
});
