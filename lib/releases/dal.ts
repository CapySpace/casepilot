import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * Reading Releases, on the authenticated side of the boundary.
 *
 * Row-level security is what decides which rows come back, the same discipline `lib/projects/dal.ts`
 * states for itself — these functions do not filter for visibility, and must not start.
 */

/** One row of a Project's Releases list. */
export type ReleaseSummary = {
  id: string;
  version: string;
  name: string | null;
  description: string | null;
  buildCount: number;
  createdAt: string;
};

type ReleaseSummaryRow = {
  id: string;
  version: string;
  name: string | null;
  description: string | null;
  created_at: string;
  /** The aggregate, counted by the database. PostgREST returns it as a single-element array. */
  builds: { count: number }[];
};

/**
 * Reading the single row PostgREST wraps an embedded aggregate in — the same shape
 * `lib/projects/dal.ts`'s `countOf` reads, for the same reason: a Build count that fell back to zero
 * on a failed embed would be indistinguishable from a Release that genuinely has none.
 */
function buildCountOf(release: { builds: { count: number }[] }): number {
  const builds = release.builds[0];
  if (!builds) throw new Error("Build count missing from the Releases query");

  return builds.count;
}

/**
 * Every Release belonging to a Project, newest first, with how many Builds each holds.
 *
 * No `project_id` filter is applied for visibility's sake — row-level security already permits only a
 * Member's own Projects' Releases — but the `.eq` below is still required: without it, this would ask
 * for every Release across every Project the caller belongs to, not the one this page is about.
 */
export const listReleases = cache(async (projectId: string): Promise<ReleaseSummary[]> => {
  await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("releases")
    .select("id, version, name, description, created_at, builds(count)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .returns<ReleaseSummaryRow[]>();

  if (error) {
    throw new Error(`Could not read the Releases of Project ${projectId}: ${error.message}`);
  }

  return (data ?? []).map((release) => ({
    id: release.id,
    version: release.version,
    name: release.name,
    description: release.description,
    buildCount: buildCountOf(release),
    createdAt: release.created_at,
  }));
});

/** A Release, as seen from inside it. Ticket 03 grows this to include its Builds. */
export type Release = {
  id: string;
  projectId: string;
  version: string;
  name: string | null;
  description: string | null;
  createdAt: string;
};

type ReleaseRow = {
  id: string;
  project_id: string;
  version: string;
  name: string | null;
  description: string | null;
  created_at: string;
};

/**
 * The Release at that id, scoped to the Project the URL names — or a 404.
 *
 * The `project_id` match is not what keeps a non-member out; row-level security already does that,
 * the same way `requireProjectMembership` explains its own 404. It is what stops a Release from
 * rendering under the *wrong* Project: a Member of two Projects could otherwise open
 * `/projects/A/releases/<a Release id that belongs to B>` and see it presented as A's, since RLS alone
 * has nothing to say about which URL a row is reached through.
 *
 * Callers are expected to have already run `requireProjectMembership(projectId)`, the same
 * deliberate-placeholder guard Phase 1's ticket 02 used for the Project Overview — this function does
 * not repeat it, only the lookup it guards.
 */
export const getRelease = cache(async (projectId: string, releaseId: string): Promise<Release> => {
  await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("releases")
    .select("id, project_id, version, name, description, created_at")
    .eq("id", releaseId)
    .eq("project_id", projectId)
    .maybeSingle<ReleaseRow>();

  if (error) {
    throw new Error(`Could not read Release ${releaseId}: ${error.message}`);
  }

  // No distinction between "no such Release", "not under this Project" and "not a Member of it" — all
  // three get the same answer, for the reason `requireProjectMembership` gives: drawing the
  // distinction is itself the disclosure.
  if (!data) notFound();

  return {
    id: data.id,
    projectId: data.project_id,
    version: data.version,
    name: data.name,
    description: data.description,
    createdAt: data.created_at,
  };
});
