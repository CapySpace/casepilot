import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { TEST_RESULT_OUTCOMES, type TestAttemptStatus, type TestResultOutcome } from "./validation";

/**
 * Reading Attempts and Results, on the authenticated side of the boundary.
 *
 * Row-level security is what decides which rows come back, the same discipline `lib/test-cases/dal.ts`
 * states for itself — these functions do not filter for visibility, and must not start.
 */

function emptyBreakdown(): Record<TestResultOutcome, number> {
  return Object.fromEntries(TEST_RESULT_OUTCOMES.map((outcome) => [outcome, 0])) as Record<
    TestResultOutcome,
    number
  >;
}

function breakdownOf(results: { outcome: TestResultOutcome }[]): Record<TestResultOutcome, number> {
  const breakdown = emptyBreakdown();
  for (const result of results) breakdown[result.outcome] += 1;
  return breakdown;
}

/** One row of a Build's Testing Attempts list, with enough of its Results to show progress. */
export type TestAttemptSummary = {
  id: string;
  attemptNumber: number;
  status: TestAttemptStatus;
  createdBy: string;
  startedAt: string;
  completedAt: string | null;
  total: number;
  tested: number;
  breakdown: Record<TestResultOutcome, number>;
};

type TestAttemptSummaryRow = {
  id: string;
  attempt_number: number;
  status: TestAttemptStatus;
  created_by: string;
  started_at: string;
  completed_at: string | null;
  results: { outcome: TestResultOutcome }[];
};

/**
 * Every Attempt taken against a Build, most recently started first — the order a Member cares about,
 * since the run they came to check on is usually the newest one.
 *
 * The `outcome` of every Result is fetched alongside each Attempt (via the FK PostgREST already knows
 * about) so progress and the Outcome breakdown can be computed here rather than trusting a client-side
 * recount — there is no pagination this phase, matching every other list in the product so far, so the
 * embed stays small.
 */
export const listTestAttempts = cache(async (buildId: string): Promise<TestAttemptSummary[]> => {
  await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("test_attempts")
    .select(
      "id, attempt_number, status, created_by, started_at, completed_at, results:test_results(outcome)",
    )
    .eq("build_id", buildId)
    .order("attempt_number", { ascending: false })
    .returns<TestAttemptSummaryRow[]>();

  if (error) {
    throw new Error(`Could not read the Attempts of Build ${buildId}: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const breakdown = breakdownOf(row.results);
    const total = row.results.length;

    return {
      id: row.id,
      attemptNumber: row.attempt_number,
      status: row.status,
      createdBy: row.created_by,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      total,
      tested: total - breakdown["Not Run"],
      breakdown,
    };
  });
});

/** A single step of a Result's frozen snapshot — the same shape a Case's own `steps` column holds. */
export type SnapshotStep = { action: string; expectedResult: string };

/** One Case's Result within an Attempt, snapshot and all. */
export type TestResultDetail = {
  id: string;
  /**
   * Not part of the snapshot — see ADR-0006 — because it can never change after assignment
   * (`freeze_test_case_provenance`), unlike title/description/preconditions/steps/expected result.
   * Joined live purely as a stable reference for the reader, the same role it plays everywhere else in
   * the product.
   */
  testCaseCode: string;
  titleSnapshot: string;
  descriptionSnapshot: string | null;
  preconditionsSnapshot: string | null;
  stepsSnapshot: SnapshotStep[];
  expectedResultSnapshot: string | null;
  outcome: TestResultOutcome;
  notes: string | null;
  executedBy: string | null;
  executedAt: string | null;
};

/** An Attempt, as seen from inside it: its own facts, and every Result taken within it. */
export type TestAttempt = {
  id: string;
  buildId: string;
  attemptNumber: number;
  status: TestAttemptStatus;
  createdBy: string;
  startedAt: string;
  completedAt: string | null;
  results: TestResultDetail[];
};

type TestResultRow = {
  id: string;
  outcome: TestResultOutcome;
  notes: string | null;
  executed_by: string | null;
  executed_at: string | null;
  test_case_title_snapshot: string;
  test_case_description_snapshot: string | null;
  test_case_preconditions_snapshot: string | null;
  test_case_steps_snapshot: { action: string; expectedResult?: string }[];
  expected_result_snapshot: string | null;
  test_case: { code: string } | null;
};

type TestAttemptRow = {
  id: string;
  build_id: string;
  attempt_number: number;
  status: TestAttemptStatus;
  created_by: string;
  started_at: string;
  completed_at: string | null;
  results: TestResultRow[];
};

/**
 * The Attempt at that id, scoped to the Build the URL names — or a 404.
 *
 * Callers are expected to have already run `getBuild(releaseId, buildId)`, the same
 * deliberate-placeholder-turned-real guard `getTestCase` itself describes relative to `getBuild`. The
 * `build_id` match below is what stops an Attempt id from rendering under the *wrong* Build.
 *
 * Results come back in Case-code order (`TC-001`, `TC-002`, …), sorted here rather than by the
 * database: PostgREST cannot order an embedded resource by a column on the embed's own further embed,
 * and the result set is small enough that sorting it in this one place is simpler than a second
 * round-trip.
 */
export const getTestAttempt = cache(async (buildId: string, attemptId: string): Promise<TestAttempt> => {
  await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("test_attempts")
    .select(
      "id, build_id, attempt_number, status, created_by, started_at, completed_at, " +
        "results:test_results(id, outcome, notes, executed_by, executed_at, test_case_title_snapshot, " +
        "test_case_description_snapshot, test_case_preconditions_snapshot, test_case_steps_snapshot, " +
        "expected_result_snapshot, test_case:test_cases(code))",
    )
    .eq("id", attemptId)
    .eq("build_id", buildId)
    .maybeSingle<TestAttemptRow>();

  if (error) {
    throw new Error(`Could not read Attempt ${attemptId}: ${error.message}`);
  }

  // No distinction between "no such Attempt", "not under this Build" and "not a Member of its
  // Project" — all three get the same answer, for the reason `getBuild` gives: drawing the distinction
  // is itself the disclosure.
  if (!data) notFound();

  const results = [...data.results].sort((a, b) =>
    (a.test_case?.code ?? "").localeCompare(b.test_case?.code ?? ""),
  );

  return {
    id: data.id,
    buildId: data.build_id,
    attemptNumber: data.attempt_number,
    status: data.status,
    createdBy: data.created_by,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    results: results.map((result) => ({
      id: result.id,
      testCaseCode: result.test_case?.code ?? "—",
      titleSnapshot: result.test_case_title_snapshot,
      descriptionSnapshot: result.test_case_description_snapshot,
      preconditionsSnapshot: result.test_case_preconditions_snapshot,
      stepsSnapshot: result.test_case_steps_snapshot.map((step) => ({
        action: step.action,
        expectedResult: step.expectedResult ?? "",
      })),
      expectedResultSnapshot: result.expected_result_snapshot,
      outcome: result.outcome,
      notes: result.notes,
      executedBy: result.executed_by,
      executedAt: result.executed_at,
    })),
  };
});
