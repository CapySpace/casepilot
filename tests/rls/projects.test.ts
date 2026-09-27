import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { signedInUser } from "../support/clients";
import { createProject } from "../support/projects";

describe("creating a Project", () => {
  it("makes the creator its Owner", async () => {
    const anna = await signedInUser();
    const id = randomUUID();

    const { error } = await anna.client.from("projects").insert({ id, name: "Mobile Banking App" });
    expect(error).toBeNull();

    const { data: project } = await anna.client
      .from("projects")
      .select("name, description, created_by")
      .eq("id", id)
      .single();

    expect(project).toEqual({
      name: "Mobile Banking App",
      description: null,
      created_by: anna.id,
    });

    const { data: memberships } = await anna.client
      .from("project_members")
      .select("user_id, role")
      .eq("project_id", id);

    expect(memberships).toEqual([{ user_id: anna.id, role: "owner" }]);
  });

  it("will not hand back the row it has just inserted", async () => {
    const anna = await signedInUser();

    // Why the creator supplies the id instead of reading one back: the SELECT policy is applied to
    // an INSERT's RETURNING row while the statement runs, and the AFTER trigger that writes the
    // Owner's Membership has not fired yet — so at that instant the creator is not yet a member of
    // their own Project. This is a property of the trigger-owned invariant, not a bug to fix by
    // loosening the policy, and it is asserted so that nobody "fixes" it by adding `created_by` to
    // the SELECT policy and quietly creating a second authority on ownership.
    const { error } = await anna.client.from("projects").insert({ name: "Returned" }).select();

    expect(error?.code).toBe("42501");
  });

  it("refuses a Project created in somebody else's name", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();

    const { error } = await anna.client
      .from("projects")
      .insert({ name: "Not Mine", created_by: peter.id });

    expect(error?.code).toBe("42501");
  });

  it("refuses a blank name", async () => {
    const anna = await signedInUser();

    const { error } = await anna.client.from("projects").insert({ name: "   " });

    expect(error?.message).toContain("projects_name_not_blank");
  });
});

describe("a Project somebody else owns", () => {
  it("is absent from a non-member's reads", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna, "Anna's Project");

    const { data: byId } = await peter.client.from("projects").select("id, name").eq("id", project);
    const { data: everything } = await peter.client.from("projects").select("id");

    expect(byId).toEqual([]);
    expect(everything).toEqual([]);
  });

  it("cannot be renamed by a non-member", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna, "Anna's Project");

    // No error: the row is invisible, so the update matches nothing. What matters is the Project.
    await peter.client.from("projects").update({ name: "Peter's Project" }).eq("id", project);

    const { data } = await anna.client.from("projects").select("name").eq("id", project).single();
    expect(data).toEqual({ name: "Anna's Project" });
  });

  it("does not let a non-member add themselves to it", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna);

    const { error } = await peter.client
      .from("project_members")
      .insert({ project_id: project, user_id: peter.id, role: "member" });

    expect(error?.code).toBe("42501");

    const { data: memberships } = await anna.client
      .from("project_members")
      .select("user_id")
      .eq("project_id", project);
    expect(memberships).toEqual([{ user_id: anna.id }]);
  });

  it("keeps its Memberships out of a non-member's reads", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    await createProject(anna);

    const { data } = await peter.client.from("project_members").select("project_id, role");

    expect(data).toEqual([]);
  });
});

describe("editing a Project", () => {
  it("lets its Owner change the name and description, and stamps updated_at", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna, "Mobile Banking App");

    const { data: before } = await anna.client
      .from("projects")
      .select("updated_at")
      .eq("id", project)
      .single();

    const { error } = await anna.client
      .from("projects")
      .update({ name: "Mobile Banking Application", description: "Testing workspace." })
      .eq("id", project);
    expect(error).toBeNull();

    const { data: after } = await anna.client
      .from("projects")
      .select("name, description, updated_at")
      .eq("id", project)
      .single();

    expect(after).toMatchObject({
      name: "Mobile Banking Application",
      description: "Testing workspace.",
    });
    expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(
      new Date(before!.updated_at).getTime(),
    );
  });

  it("refuses an edit that would leave the name blank", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);

    const { error } = await anna.client.from("projects").update({ name: "" }).eq("id", project);

    expect(error?.message).toContain("projects_name_not_blank");
  });
});

describe("a Project's provenance", () => {
  it("cannot be rewritten, even by its Owner", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await createProject(anna);

    const { error } = await anna.client
      .from("projects")
      .update({ created_by: peter.id })
      .eq("id", project);

    expect(error?.message).toContain("cannot be changed");

    const { data } = await anna.client
      .from("projects")
      .select("created_by")
      .eq("id", project)
      .single();
    expect(data).toEqual({ created_by: anna.id });
  });
});
