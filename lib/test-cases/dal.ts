import "server-only";

import { cache } from "react";

import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import type { TestCasePriority, TestCaseStatus } from "./validation";

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
