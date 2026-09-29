import { describe, expect, it } from "vitest";

import { signedInUser } from "../support/clients";
import { createBuild } from "../support/builds";
import { createProject, projectWithMember } from "../support/projects";
import { createRelease } from "../support/releases";
import { createTestAttempt, createTestResult } from "../support/test-attempts";
import { createTestCase } from "../support/test-cases";

async function projectBuild(owner: Awaited<ReturnType<typeof signedInUser>>) {
  const project = await createProject(owner);
  const release = await createRelease(owner, project);
  const build = await createBuild(owner, release);
  return { project, release, build };
}

describe("starting an Attempt", () => {
  it("is allowed for any Member of the Project, not only its Owner", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);
    const release = await createRelease(anna, project);
    const build = await createBuild(anna, release);

    const attempt = await createTestAttempt(peter, build);

    const { data } = await anna.client
      .from("test_attempts")
      .select("build_id")
      .eq("id", attempt)
      .single();
    expect(data).toEqual({ build_id: build });
  });

  it("cannot be started by a non-member", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const { build } = await projectBuild(anna);

    const { error } = await stranger.client.from("test_attempts").insert({ build_id: build });

    expect(error?.code).toBe("42501");
  });

  it("defaults status to In Progress and records who started it", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const attempt = await createTestAttempt(anna, build);

    const { data } = await anna.client
      .from("test_attempts")
      .select("status, created_by")
      .eq("id", attempt)
      .single();
    expect(data).toEqual({ status: "In Progress", created_by: anna.id });
  });

  it("refuses an Attempt inserted already Completed", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const { error } = await anna.client
      .from("test_attempts")
      .insert({ build_id: build, status: "Completed" });

    expect(error?.code).toBe("42501");
  });
});

describe("start_test_attempt", () => {
  it("creates the Attempt and one Not Run Result per eligible Case, snapshotting its fields", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const testCase = await createTestCase(anna, build, "Sign in with valid credentials");
    await anna.client
      .from("test_cases")
      .update({ description: "Checks the happy path.", preconditions: "An account exists." })
      .eq("id", testCase);

    const { data: attempt, error } = await anna.client
      .rpc("start_test_attempt", { p_build_id: build })
      .single();

    expect(error).toBeNull();
    expect(attempt).toMatchObject({ build_id: build, status: "In Progress" });

    const { data: results } = await anna.client
      .from("test_results")
      .select(
        "test_case_id, outcome, test_case_title_snapshot, test_case_description_snapshot, test_case_preconditions_snapshot",
      )
      .eq("testing_attempt_id", (attempt as { id: string }).id);

    expect(results).toEqual([
      {
        test_case_id: testCase,
        outcome: "Not Run",
        test_case_title_snapshot: "Sign in with valid credentials",
        test_case_description_snapshot: "Checks the happy path.",
        test_case_preconditions_snapshot: "An account exists.",
      },
    ]);
  });

  it("excludes a Case added to the Build after the Attempt starts", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    await createTestCase(anna, build, "Existing case");

    const { data: attempt } = await anna.client
      .rpc("start_test_attempt", { p_build_id: build })
      .single<{ id: string }>();
    await createTestCase(anna, build, "Added after the Attempt started");

    const { data: results } = await anna.client
      .from("test_results")
      .select("test_case_title_snapshot")
      .eq("testing_attempt_id", attempt!.id);

    expect(results).toEqual([{ test_case_title_snapshot: "Existing case" }]);
  });

  it("excludes a soft-deleted Case", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const deleted = await createTestCase(anna, build, "Deleted case");
    await anna.client
      .from("test_cases")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deleted);
    await createTestCase(anna, build, "Live case");

    const { data: attempt } = await anna.client
      .rpc("start_test_attempt", { p_build_id: build })
      .single<{ id: string }>();

    const { data: results } = await anna.client
      .from("test_results")
      .select("test_case_title_snapshot")
      .eq("testing_attempt_id", attempt!.id);

    expect(results).toEqual([{ test_case_title_snapshot: "Live case" }]);
  });

  it("refuses to start on a Build with no eligible Cases, and creates nothing", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const { error } = await anna.client.rpc("start_test_attempt", { p_build_id: build }).single();

    expect(error).not.toBeNull();

    const { data: attempts } = await anna.client.from("test_attempts").select("id").eq("build_id", build);
    expect(attempts).toEqual([]);
  });

  it("refuses a non-member the same way it refuses an empty Build", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const { build } = await projectBuild(anna);
    await createTestCase(anna, build);

    const { error } = await stranger.client.rpc("start_test_attempt", { p_build_id: build }).single();

    expect(error).not.toBeNull();

    const { data: attempts } = await anna.client.from("test_attempts").select("id").eq("build_id", build);
    expect(attempts).toEqual([]);
  });
});

describe("an Attempt's number", () => {
  it("is assigned automatically, in order, per Build", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const first = await createTestAttempt(anna, build);
    const second = await createTestAttempt(anna, build);

    const { data } = await anna.client
      .from("test_attempts")
      .select("id, attempt_number")
      .in("id", [first, second]);

    const numbers = Object.fromEntries((data ?? []).map((row) => [row.id, row.attempt_number]));
    expect(numbers[first]).toBe(1);
    expect(numbers[second]).toBe(2);
  });

  it("restarts at 1 in a different Build", async () => {
    const anna = await signedInUser();
    const project = await createProject(anna);
    const release = await createRelease(anna, project);
    const buildA = await createBuild(anna, release, "100");
    const buildB = await createBuild(anna, release, "200");
    await createTestAttempt(anna, buildA);

    const attempt = await createTestAttempt(anna, buildB);

    const { data } = await anna.client
      .from("test_attempts")
      .select("attempt_number")
      .eq("id", attempt)
      .single();
    expect(data).toEqual({ attempt_number: 1 });
  });

  it("assigns distinct numbers to two Attempts started on the same Build at the same moment", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);

    const [first, second] = await Promise.all([
      createTestAttempt(anna, build),
      createTestAttempt(anna, build),
    ]);

    const { data } = await anna.client
      .from("test_attempts")
      .select("attempt_number")
      .in("id", [first, second]);

    const numbers = (data ?? []).map((row) => row.attempt_number).sort();
    expect(numbers).toEqual([1, 2]);
  });
});

describe("a Project's Attempts", () => {
  it("are absent from a non-member's reads", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const { build } = await projectBuild(anna);
    await createTestAttempt(anna, build);

    const { data } = await stranger.client.from("test_attempts").select("id");
    expect(data).toEqual([]);
  });
});

describe("completing an Attempt", () => {
  it("is allowed for any Member, not only whoever started it", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);
    const release = await createRelease(anna, project);
    const build = await createBuild(anna, release);
    const attempt = await createTestAttempt(anna, build);

    const { error } = await peter.client
      .from("test_attempts")
      .update({ status: "Completed", completed_at: new Date().toISOString() })
      .eq("id", attempt);
    expect(error).toBeNull();

    const { data } = await anna.client
      .from("test_attempts")
      .select("status")
      .eq("id", attempt)
      .single();
    expect(data).toEqual({ status: "Completed" });
  });

  it("cannot be updated again once Completed — not even back to In Progress", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const attempt = await createTestAttempt(anna, build);
    await anna.client.from("test_attempts").update({ status: "Completed" }).eq("id", attempt);

    await anna.client.from("test_attempts").update({ status: "In Progress" }).eq("id", attempt);

    const { data } = await anna.client
      .from("test_attempts")
      .select("status")
      .eq("id", attempt)
      .single();
    expect(data).toEqual({ status: "Completed" });
  });

  it("cannot be updated by a non-member", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const { build } = await projectBuild(anna);
    const attempt = await createTestAttempt(anna, build);

    await stranger.client.from("test_attempts").update({ status: "Completed" }).eq("id", attempt);

    const { data } = await anna.client
      .from("test_attempts")
      .select("status")
      .eq("id", attempt)
      .single();
    expect(data).toEqual({ status: "In Progress" });
  });

  it("refuses a change to its id, Build, number, starter or start time, even while In Progress", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const attempt = await createTestAttempt(anna, build);
    const otherBuild = await createBuild(anna, await createRelease(anna, await createProject(anna)));

    const { error } = await anna.client
      .from("test_attempts")
      .update({ build_id: otherBuild })
      .eq("id", attempt);

    expect(error?.message).toContain("cannot be changed");
  });
});

describe("deleting an Attempt", () => {
  it("is allowed while In Progress, for any Member", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);
    const release = await createRelease(anna, project);
    const build = await createBuild(anna, release);
    const attempt = await createTestAttempt(anna, build);

    const { error } = await peter.client.from("test_attempts").delete().eq("id", attempt);
    expect(error).toBeNull();

    const { data } = await anna.client
      .from("test_attempts")
      .select("id")
      .eq("id", attempt)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("is refused once Completed", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const attempt = await createTestAttempt(anna, build);
    await anna.client.from("test_attempts").update({ status: "Completed" }).eq("id", attempt);

    await anna.client.from("test_attempts").delete().eq("id", attempt);

    const { data } = await anna.client
      .from("test_attempts")
      .select("id")
      .eq("id", attempt)
      .maybeSingle();
    expect(data).toEqual({ id: attempt });
  });

  it("cannot be deleted by a non-member", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const { build } = await projectBuild(anna);
    const attempt = await createTestAttempt(anna, build);

    await stranger.client.from("test_attempts").delete().eq("id", attempt);

    const { data } = await anna.client
      .from("test_attempts")
      .select("id")
      .eq("id", attempt)
      .maybeSingle();
    expect(data).toEqual({ id: attempt });
  });
});

describe("creating a Result", () => {
  it("is allowed for any Member of the Project", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);
    const release = await createRelease(anna, project);
    const build = await createBuild(anna, release);
    const attempt = await createTestAttempt(anna, build);
    const testCase = await createTestCase(anna, build);

    const result = await createTestResult(peter, attempt, testCase);

    const { data } = await anna.client.from("test_results").select("outcome").eq("id", result).single();
    expect(data).toEqual({ outcome: "Not Run" });
  });

  it("cannot be created by a non-member", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const { build } = await projectBuild(anna);
    const attempt = await createTestAttempt(anna, build);
    const testCase = await createTestCase(anna, build);

    const { error } = await stranger.client.from("test_results").insert({
      testing_attempt_id: attempt,
      test_case_id: testCase,
      test_case_title_snapshot: "Sign in",
    });

    expect(error?.code).toBe("42501");
  });

  it("refuses a Result inserted with an Outcome other than Not Run", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const attempt = await createTestAttempt(anna, build);
    const testCase = await createTestCase(anna, build);

    const { error } = await anna.client.from("test_results").insert({
      testing_attempt_id: attempt,
      test_case_id: testCase,
      test_case_title_snapshot: "Sign in",
      outcome: "Passed",
    });

    expect(error?.code).toBe("42501");
  });

  it("refuses two Results for the same Case in the same Attempt", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const attempt = await createTestAttempt(anna, build);
    const testCase = await createTestCase(anna, build);
    await createTestResult(anna, attempt, testCase);

    const { error } = await anna.client.from("test_results").insert({
      testing_attempt_id: attempt,
      test_case_id: testCase,
      test_case_title_snapshot: "Sign in",
    });

    expect(error?.message).toContain("test_results_one_per_case_per_attempt");
  });
});

describe("a Result's snapshot", () => {
  it("cannot be changed once recorded, even while the Attempt is still In Progress", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const attempt = await createTestAttempt(anna, build);
    const testCase = await createTestCase(anna, build, "Sign in with valid credentials");
    const result = await createTestResult(anna, attempt, testCase, "Sign in with valid credentials");

    const { error } = await anna.client
      .from("test_results")
      .update({ test_case_title_snapshot: "Rewritten after the fact" })
      .eq("id", result);

    expect(error?.message).toContain("identity and Case snapshot cannot be changed");
  });
});

describe("recording a Result", () => {
  it("is allowed for any Member, not only whoever started the Attempt", async () => {
    const anna = await signedInUser();
    const peter = await signedInUser();
    const project = await projectWithMember(anna, peter);
    const release = await createRelease(anna, project);
    const build = await createBuild(anna, release);
    const attempt = await createTestAttempt(anna, build);
    const testCase = await createTestCase(anna, build);
    const result = await createTestResult(anna, attempt, testCase);

    const { error } = await peter.client
      .from("test_results")
      .update({
        outcome: "Passed",
        notes: "Looks good",
        executed_by: peter.id,
        executed_at: new Date().toISOString(),
      })
      .eq("id", result);
    expect(error).toBeNull();

    const { data } = await anna.client
      .from("test_results")
      .select("outcome, executed_by")
      .eq("id", result)
      .single();
    expect(data).toEqual({ outcome: "Passed", executed_by: peter.id });
  });

  it("refuses an invalid Outcome value", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const attempt = await createTestAttempt(anna, build);
    const testCase = await createTestCase(anna, build);
    const result = await createTestResult(anna, attempt, testCase);

    const { error } = await anna.client
      .from("test_results")
      .update({ outcome: "Nonsense" })
      .eq("id", result);

    expect(error?.message).toContain("test_results_outcome");
  });

  it("cannot be changed by a non-member", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const { build } = await projectBuild(anna);
    const attempt = await createTestAttempt(anna, build);
    const testCase = await createTestCase(anna, build);
    const result = await createTestResult(anna, attempt, testCase);

    await stranger.client.from("test_results").update({ outcome: "Passed" }).eq("id", result);

    const { data } = await anna.client
      .from("test_results")
      .select("outcome")
      .eq("id", result)
      .single();
    expect(data).toEqual({ outcome: "Not Run" });
  });

  it("is refused once the Attempt is Completed, even for a field as small as notes", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const attempt = await createTestAttempt(anna, build);
    const testCase = await createTestCase(anna, build);
    const result = await createTestResult(anna, attempt, testCase);
    await anna.client.from("test_attempts").update({ status: "Completed" }).eq("id", attempt);

    const { error } = await anna.client
      .from("test_results")
      .update({ notes: "Too late" })
      .eq("id", result);

    expect(error?.message).toContain("cannot be changed once its Attempt is Completed");
  });
});

describe("a Project's Results", () => {
  it("are absent from a non-member's reads", async () => {
    const anna = await signedInUser();
    const stranger = await signedInUser();
    const { build } = await projectBuild(anna);
    const attempt = await createTestAttempt(anna, build);
    const testCase = await createTestCase(anna, build);
    await createTestResult(anna, attempt, testCase);

    const { data } = await stranger.client.from("test_results").select("id");
    expect(data).toEqual([]);
  });

  it("are removed when their Attempt is deleted", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const attempt = await createTestAttempt(anna, build);
    const testCase = await createTestCase(anna, build);
    const result = await createTestResult(anna, attempt, testCase);

    await anna.client.from("test_attempts").delete().eq("id", attempt);

    const { data } = await anna.client
      .from("test_results")
      .select("id")
      .eq("id", result)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("cannot be deleted on their own by anybody, since no delete policy exists", async () => {
    const anna = await signedInUser();
    const { build } = await projectBuild(anna);
    const attempt = await createTestAttempt(anna, build);
    const testCase = await createTestCase(anna, build);
    const result = await createTestResult(anna, attempt, testCase);

    await anna.client.from("test_results").delete().eq("id", result);

    const { data } = await anna.client
      .from("test_results")
      .select("id")
      .eq("id", result)
      .maybeSingle();
    expect(data).toEqual({ id: result });
  });
});
