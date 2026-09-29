import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import type { StepDetails, TestCasePriority, TestCaseStatus } from "./validation";

/**
 * Reading Cases, on the authenticated side of the boundary.
 *
 * Row-level security is what decides which rows come back, the same discipline `lib/builds/dal.ts`
 * states for itself — these functions do not filter for visibility, and must not start.
 */

/** One row of a Build's Case list. */
export type TestCaseSummary = {
  id: string;
  code: string;
  title: string;
  priority: TestCasePriority;
  status: TestCaseStatus;
};

type TestCaseSummaryRow = {
  id: string;
  code: string;
  title: string;
  priority: TestCasePriority;
  status: TestCaseStatus;
};

/**
 * Every Case recorded under a Build, newest first — the order a Member cares about, since a case
 * written moments ago is usually the one they came back to check.
 *
 * Soft-deleted Cases are excluded here, not by row-level security: RLS decides membership-visibility
 * only, per the migration's own comment. `.eq("build_id", ...)` is still required beyond what RLS
 * already permits, for the same reason `listBuilds`'s own comment gives — without it this would ask
 * for every Case across every Build the caller can see, not the one Build this page is about.
 */
export const listTestCases = cache(async (buildId: string): Promise<TestCaseSummary[]> => {
  await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("test_cases")
    .select("id, code, title, priority, status")
    .eq("build_id", buildId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<TestCaseSummaryRow[]>();

  if (error) {
    throw new Error(`Could not read the Cases of Build ${buildId}: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    title: row.title,
    priority: row.priority,
    status: row.status,
  }));
});

/**
 * The ids of every `Ready` Case under a Build — the subset the Build Report's totals are computed
 * from, per the "only Ready Cases count" decision. Filtered at the query, the same way `deleted_at`
 * is filtered here rather than left to the caller: the DAL decides which subset a page gets, not the
 * page itself.
 */
export const listReadyTestCaseIds = cache(async (buildId: string): Promise<string[]> => {
  await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("test_cases")
    .select("id")
    .eq("build_id", buildId)
    .eq("status", "Ready")
    .is("deleted_at", null)
    .returns<{ id: string }[]>();

  if (error) {
    throw new Error(`Could not read the Ready Cases of Build ${buildId}: ${error.message}`);
  }

  return (data ?? []).map((row) => row.id);
});

/** A Case, as seen from inside it. */
export type TestCase = {
  id: string;
  buildId: string;
  code: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  steps: StepDetails[];
  expectedResult: string | null;
  priority: TestCasePriority;
  status: TestCaseStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

type TestCaseRow = {
  id: string;
  build_id: string;
  code: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  steps: { action: string; expectedResult?: string }[];
  expected_result: string | null;
  priority: TestCasePriority;
  status: TestCaseStatus;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

/**
 * The Case at that id, scoped to the Build the URL names — or a 404.
 *
 * Callers are expected to have already run `getBuild(releaseId, buildId)`, the same
 * deliberate-placeholder-turned-real guard `getBuild` itself describes relative to
 * `requireProjectMembership`. That call already proves the Build belongs to this Release and Project and
 * the caller is a Member of it; the `build_id` match below is what stops a Case id from rendering under
 * the *wrong* Build — a Member of the Project could otherwise open a Case belonging to a different Build
 * and see it presented as this one's.
 *
 * `deleted_at is null` excludes a soft-deleted Case here, not at the row-level security layer — see
 * `listTestCases`'s own comment.
 */
export const getTestCase = cache(async (buildId: string, testCaseId: string): Promise<TestCase> => {
  await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("test_cases")
    .select(
      "id, build_id, code, title, description, preconditions, steps, expected_result, priority, status, created_by, updated_by, created_at, updated_at",
    )
    .eq("id", testCaseId)
    .eq("build_id", buildId)
    .is("deleted_at", null)
    .maybeSingle<TestCaseRow>();

  if (error) {
    throw new Error(`Could not read Case ${testCaseId}: ${error.message}`);
  }

  // No distinction between "no such Case", "not under this Build", "deleted" and "not a Member of its
  // Project" — all four get the same answer, for the reason `getBuild` gives: drawing the distinction is
  // itself the disclosure.
  if (!data) notFound();

  return {
    id: data.id,
    buildId: data.build_id,
    code: data.code,
    title: data.title,
    description: data.description,
    preconditions: data.preconditions,
    steps: data.steps.map((step) => ({ action: step.action, expectedResult: step.expectedResult ?? "" })),
    expectedResult: data.expected_result,
    priority: data.priority,
    status: data.status,
    createdBy: data.created_by,
    updatedBy: data.updated_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
});
