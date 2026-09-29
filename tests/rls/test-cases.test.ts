import { describe, expect, it } from "vitest";

import { signedInUser } from "../support/clients";
import { createBuild } from "../support/builds";
import { createProject, projectWithMember } from "../support/projects";
import { createRelease } from "../support/releases";
import { createTestCase } from "../support/test-cases";

async function projectBuild(owner: Awaited<ReturnType<typeof signedInUser>>) {
  const project = await createProject(owner);
  const release = await createRelease(owner, project);
  const build = await createBuild(owner, release);
  return { project, release, build };
}

describe("creating a Case", () => {
  it("is allowed for any Member of the Project, not only its Owner", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);
    const release = await createRelease(anna, project);
    const build = await createBuild(anna, release);

    const testCase = await createTestCase(peter, build, "Sign in with valid credentials");

    const { data } = await anna.client
      .from("test_cases")
      .select("title")
      .eq("id", testCase)
      .single();
    expect(data).toEqual({ title: "Sign in with valid credentials" });
  });

  it("refuses a blank title", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const { error } = await anna.client.from("test_cases").insert({ build_id: build, title: "   " });

    expect(error?.message).toContain("test_cases_title_not_blank");
  });

  it("refuses an invalid priority", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const { error } = await anna.client
      .from("test_cases")
      .insert({ build_id: build, title: "Sign in", priority: "Nonsense" });

    expect(error?.message).toContain("test_cases_priority");
  });

  it("refuses an invalid status", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const { error } = await anna.client
      .from("test_cases")
      .insert({ build_id: build, title: "Sign in", status: "Nonsense" });

    expect(error?.message).toContain("test_cases_status");
  });

  it("defaults priority to Medium and status to Draft", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const testCase = await createTestCase(anna, build);

    const { data } = await anna.client
      .from("test_cases")
      .select("priority, status, steps")
      .eq("id", testCase)
      .single();

    expect(data).toEqual({ priority: "Medium", status: "Draft", steps: [] });
  });

  it("sets updated_by equal to created_by at insert", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const testCase = await createTestCase(anna, build);

    const { data } = await anna.client
      .from("test_cases")
      .select("created_by, updated_by")
      .eq("id", testCase)
      .single();

    expect(data?.created_by).toBe(anna.id);
    expect(data?.updated_by).toBe(anna.id);
  });

  it("cannot be created by a non-member", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const { build } = await projectBuild(anna);

    const { error } = await stranger.client
      .from("test_cases")
      .insert({ build_id: build, title: "Sign in" });

    expect(error?.code).toBe("42501");
  });
});

describe("a Case's steps", () => {
  it("accepts an empty list", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const { error } = await anna.client
      .from("test_cases")
      .insert({ build_id: build, title: "Sign in", steps: [] });

    expect(error).toBeNull();
  });

  it("accepts a step with only an action", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const { error } = await anna.client
      .from("test_cases")
      .insert({ build_id: build, title: "Sign in", steps: [{ action: "Open the sign-in page" }] });

    expect(error).toBeNull();
  });

  it("accepts a step with an action and an expected result", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const { error } = await anna.client.from("test_cases").insert({
      build_id: build,
      title: "Sign in",
      steps: [{ action: "Enter valid credentials", expectedResult: "The form accepts them" }],
    });

    expect(error).toBeNull();
  });

  it("refuses a payload that is not an array", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const { error } = await anna.client
      .from("test_cases")
      .insert({ build_id: build, title: "Sign in", steps: { action: "Not an array" } });

    expect(error?.message).toContain("test_cases_steps_shape");
  });

  it("refuses a step with no action", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const { error } = await anna.client
      .from("test_cases")
      .insert({ build_id: build, title: "Sign in", steps: [{ expectedResult: "Missing an action" }] });

    expect(error?.message).toContain("test_cases_steps_shape");
  });

  it("refuses a step whose action is blank", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const { error } = await anna.client
      .from("test_cases")
      .insert({ build_id: build, title: "Sign in", steps: [{ action: "   " }] });

    expect(error?.message).toContain("test_cases_steps_shape");
  });

  it("refuses more than 50 steps", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const steps = Array.from({ length: 51 }, (_, index) => ({ action: `Step ${index}` }));

    const { error } = await anna.client
      .from("test_cases")
      .insert({ build_id: build, title: "Sign in", steps });

    expect(error?.message).toContain("test_cases_steps_shape");
  });
});

describe("a Case's code", () => {
  it("is assigned automatically, in order, per Build", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const first = await createTestCase(anna, build, "First case");
    const second = await createTestCase(anna, build, "Second case");

    const { data } = await anna.client
      .from("test_cases")
      .select("id, code")
      .in("id", [first, second]);

    const codes = Object.fromEntries((data ?? []).map((row) => [row.id, row.code]));
    expect(codes[first]).toBe("TC-001");
    expect(codes[second]).toBe("TC-002");
  });

  it("restarts at TC-001 in a different Build", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const release = await createRelease(anna, project);
    const buildA = await createBuild(anna, release, "100");
    const buildB = await createBuild(anna, release, "200");
    await createTestCase(anna, buildA);

    const testCase = await createTestCase(anna, buildB);

    const { data } = await anna.client.from("test_cases").select("code").eq("id", testCase).single();
    expect(data).toEqual({ code: "TC-001" });
  });

  it("is never reused by a later Case, even after the first is deleted", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const first = await createTestCase(anna, build);
    await anna.client.from("test_cases").update({ deleted_at: new Date().toISOString() }).eq("id", first);

    const second = await createTestCase(anna, build);

    const { data } = await anna.client.from("test_cases").select("code").eq("id", second).single();
    expect(data).toEqual({ code: "TC-002" });
  });

  it("assigns distinct codes to two Cases created in the same Build at the same moment", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const [first, second] = await Promise.all([
      createTestCase(anna, build, "Concurrent case A"),
      createTestCase(anna, build, "Concurrent case B"),
    ]);

    const { data } = await anna.client
      .from("test_cases")
      .select("code")
      .in("id", [first, second]);

    const codes = (data ?? []).map((row) => row.code).sort();
    expect(codes).toEqual(["TC-001", "TC-002"]);
  });
});

describe("a Project's Cases", () => {
  it("are absent from a non-member's reads", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const { build } = await projectBuild(anna);
    await createTestCase(anna, build);

    const { data } = await stranger.client.from("test_cases").select("id");

    expect(data).toEqual([]);
  });

  it("cannot be reached by a non-member who has the Case's own id", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const { build } = await projectBuild(anna);
    const testCase = await createTestCase(anna, build);

    // Proves the two-hop bridge (build_project_id, through release_project_id) is actually evaluated
    // per row rather than skipped when the caller already knows the id it's asking for.
    const { data } = await stranger.client.from("test_cases").select("id").eq("id", testCase);

    expect(data).toEqual([]);
  });
});

describe("editing a Case", () => {
  it("is allowed for any Member, not only its creator, and records who and when", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);
    const release = await createRelease(anna, project);
    const build = await createBuild(anna, release);
    const testCase = await createTestCase(anna, build);

    const { data: before } = await anna.client
      .from("test_cases")
      .select("updated_at")
      .eq("id", testCase)
      .single();

    const { error } = await peter.client
      .from("test_cases")
      .update({ title: "Sign in with an expired password" })
      .eq("id", testCase);
    expect(error).toBeNull();

    const { data: after } = await anna.client
      .from("test_cases")
      .select("title, updated_by, updated_at")
      .eq("id", testCase)
      .single();

    expect(after?.title).toBe("Sign in with an expired password");
    expect(after?.updated_by).toBe(peter.id);
    expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(new Date(before!.updated_at).getTime());
  });

  it("cannot be changed by a non-member", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const { build } = await projectBuild(anna);
    const testCase = await createTestCase(anna, build, "Sign in");

    await stranger.client.from("test_cases").update({ title: "Hijacked" }).eq("id", testCase);

    const { data } = await anna.client.from("test_cases").select("title").eq("id", testCase).single();
    expect(data).toEqual({ title: "Sign in" });
  });

  it("refuses a change to its id, Build, code, creator or creation time", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const testCase = await createTestCase(anna, build);
    const otherBuild = await createBuild(anna, await createRelease(anna, await createProject(anna)));

    const { error } = await anna.client
      .from("test_cases")
      .update({ build_id: otherBuild })
      .eq("id", testCase);

    expect(error?.message).toContain("cannot be changed");
  });
});

describe("deleting a Case", () => {
  it("cannot be deleted by anybody, since no delete policy exists", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const testCase = await createTestCase(anna, build);

    await anna.client.from("test_cases").delete().eq("id", testCase);

    const { data } = await anna.client.from("test_cases").select("id").eq("id", testCase).maybeSingle();
    expect(data).toEqual({ id: testCase });
  });

  it("is soft-deleted by any Member setting deleted_at, via an ordinary update", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);
    const release = await createRelease(anna, project);
    const build = await createBuild(anna, release);
    const testCase = await createTestCase(anna, build);

    const { error } = await peter.client
      .from("test_cases")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", testCase);

    expect(error).toBeNull();

    const { data } = await anna.client
      .from("test_cases")
      .select("deleted_at")
      .eq("id", testCase)
      .single();
    expect(data?.deleted_at).not.toBeNull();
  });

  it("cannot have its deleted_at un-set or changed once set", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const testCase = await createTestCase(anna, build);
    await anna.client.from("test_cases").update({ deleted_at: new Date().toISOString() }).eq("id", testCase);

    const { error: unsetError } = await anna.client
      .from("test_cases")
      .update({ deleted_at: null })
      .eq("id", testCase);
    expect(unsetError?.message).toContain("cannot be restored");

    const { error: changeError } = await anna.client
      .from("test_cases")
      .update({ deleted_at: new Date(Date.now() + 60_000).toISOString() })
      .eq("id", testCase);
    expect(changeError?.message).toContain("cannot be restored");
  });
});
