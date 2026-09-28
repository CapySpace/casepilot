import { describe, expect, it } from "vitest";

import { hashInvitationToken } from "@/lib/projects/invitation-token";

import { adminClient, anonymousClient, signedInUser } from "../support/clients";
import { attemptInvite, inviteByEmail } from "../support/invitations";
import { createProject, projectWithMember } from "../support/projects";

describe("the people in a Project", () => {
  it("are listed to a Member with their name, address, Role and joined date", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);

    const { data, error } = await peter.client.rpc("project_people", { p_project_id: project });

    expect(error).toBeNull();
    // The Owner first, then whoever joined next: a list of people has an order, and "who runs this"
    // is the useful one.
    expect(data).toMatchObject([
      { user_id: anna.id, full_name: anna.fullName, email: anna.email, role: "owner" },
      { user_id: peter.id, full_name: peter.fullName, email: peter.email, role: "member" },
    ]);
    expect(new Date(data[1].joined_at).getTime()).toBeGreaterThanOrEqual(
      new Date(data[0].joined_at).getTime(),
    );
  });

  it("are not listed to somebody outside the Project", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const stranger = await signedInUser();
    const project = await projectWithMember(anna, peter);

    const { data, error } = await stranger.client.rpc("project_people", { p_project_id: project });

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("are not listed to a visitor with no session", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);

    const { error } = await anonymousClient().rpc("project_people", { p_project_id: project });

    expect(error).not.toBeNull();
  });
});

describe("a Member who is not the Owner", () => {
  it("can read the Project and its Memberships", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter, "Mobile Banking App");

    const { data: projects } = await peter.client.from("projects").select("id, name");
    const { data: memberships } = await peter.client
      .from("project_members")
      .select("user_id, role")
      .eq("project_id", project);

    expect(projects).toEqual([{ id: project, name: "Mobile Banking App" }]);
    expect(memberships).toHaveLength(2);
  });

  it("cannot rename it", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter, "Anna's Project");

    await peter.client.from("projects").update({ name: "Peter's Project" }).eq("id", project);

    const { data } = await anna.client.from("projects").select("name").eq("id", project).single();
    expect(data).toEqual({ name: "Anna's Project" });
  });

  it("cannot invite anybody", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);

    const { error } = await attemptInvite(peter, project, "stranger@example.com");

    expect(error?.code).toBe("42501");
  });

  it("cannot read the Project's Invitations", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);
    await inviteByEmail(anna, project, "stranger@example.com");

    const { data } = await peter.client.from("project_invitations").select("email");

    expect(data).toEqual([]);
  });

  it("cannot promote themselves", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);

    await peter.client
      .from("project_members")
      .update({ role: "owner" })
      .eq("project_id", project)
      .eq("user_id", peter.id);

    const { data } = await anna.client
      .from("project_members")
      .select("role")
      .eq("project_id", project)
      .eq("user_id", peter.id)
      .single();
    expect(data).toEqual({ role: "member" });
  });

  it("can remove only themselves, however widely they ask", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);

    // A deletion aimed at the whole Project takes exactly one row with it: leaving is a Member's to do,
    // and removing anybody else is not. The policy decides that row by row, so the breadth of the request
    // makes no difference.
    await peter.client.from("project_members").delete().eq("project_id", project);

    const { data } = await anna.client
      .from("project_members")
      .select("user_id")
      .eq("project_id", project);
    expect(data).toEqual([{ user_id: anna.id }]);
  });
});

describe("a Project's single Owner", () => {
  it("cannot be joined by a second one, even by an administrator", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const project = await createProject(anna);

    // CONTEXT.md states "every Project has exactly one Owner" as a fact about a Project, so the
    // database states it too. No policy in this phase can write an owner row — only the creation
    // trigger does — which is why this asks the administrative client: a unique index refuses the
    // service role exactly as it refuses anybody, and that is the fact under test.
    //
    // The second Owner is somebody with no Membership at all, so that the index under test is the
    // one about Owners and not the one about joining twice.
    const { error } = await adminClient()
      .from("project_members")
      .insert({ project_id: project, user_id: stranger.id, role: "owner" });

    expect(error?.code).toBe("23505");
    expect(error?.message).toContain("project_members_one_owner");
  });
});

describe("leaving and removing", () => {
  it("lets a Member delete their own Membership", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);

    const { error } = await peter.client
      .from("project_members")
      .delete()
      .eq("project_id", project)
      .eq("user_id", peter.id);

    expect(error).toBeNull();

    // Access ended with the Membership: it is what made the Project visible in the first place.
    const { data: projects } = await peter.client.from("projects").select("id");
    expect(projects).toEqual([]);

    const { data: remaining } = await anna.client
      .from("project_members")
      .select("user_id")
      .eq("project_id", project);
    expect(remaining).toEqual([{ user_id: anna.id }]);
  });

  it("does not let a Member remove anybody else", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);

    await peter.client
      .from("project_members")
      .delete()
      .eq("project_id", project)
      .eq("user_id", anna.id);

    const { data } = await anna.client
      .from("project_members")
      .select("user_id")
      .eq("project_id", project);
    expect(data).toHaveLength(2);
  });

  it("lets an Owner remove a Member", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);

    const { error } = await anna.client
      .from("project_members")
      .delete()
      .eq("project_id", project)
      .eq("user_id", peter.id);

    expect(error).toBeNull();
    const { data: projects } = await peter.client.from("projects").select("id");
    expect(projects).toEqual([]);
  });

  it("does not let an Owner remove themselves", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);

    // No policy admits it, so nothing happens — which is the same answer the interface gives by having no
    // Leave control for an Owner.
    await anna.client
      .from("project_members")
      .delete()
      .eq("project_id", project)
      .eq("user_id", anna.id);

    const { data } = await anna.client
      .from("project_members")
      .select("role")
      .eq("project_id", project)
      .eq("user_id", anna.id)
      .maybeSingle();
    expect(data).toEqual({ role: "owner" });
  });

  it("refuses to leave a Project with no Owner, even for an administrator", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);

    // Row-level security is not the guard here: a Project without an Owner is nobody's to manage and
    // nothing can transfer ownership yet, so the database refuses it whoever asks.
    const { error } = await adminClient()
      .from("project_members")
      .delete()
      .eq("project_id", project)
      .eq("role", "owner");

    expect(error?.message).toContain("last owner");
  });

  it("lets a removed User be invited again", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);
    await anna.client
      .from("project_members")
      .delete()
      .eq("project_id", project)
      .eq("user_id", peter.id);

    const { token } = await inviteByEmail(anna, project, peter.email);
    const { data } = await peter.client.rpc("accept_invitation", {
      p_token_hash: hashInvitationToken(token),
    });

    expect(data).toEqual([{ project_id: project, outcome: "accepted" }]);
  });
});
