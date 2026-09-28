import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * Reading Builds, on the authenticated side of the boundary.
 *
 * Row-level security is what decides which rows come back, the same discipline `lib/releases/dal.ts`
 * states for itself — these functions do not filter for visibility, and must not start.
 */

/** One row of a Release's Builds list. */
export type BuildSummary = {
  id: string;
  buildNumber: string;
  createdAt: string;
};

type BuildSummaryRow = {
  id: string;
  build_number: string;
  created_at: string;
};

/**
 * Every Build recorded under a Release, newest first — the order a Member cares about, since the most
 * recently produced Build is usually the one they came to look at.
 *
 * No `release_id` filter is applied for visibility's sake — row-level security already permits only a
 * Member's own Projects' Builds — but the `.eq` below is still required, for the same reason
 * `listReleases`'s own comment gives: without it this would ask for every Build across every Release
 * the caller can see, not the one Release this page is about.
 */
export const listBuilds = cache(async (releaseId: string): Promise<BuildSummary[]> => {
  await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("builds")
    .select("id, build_number, created_at")
    .eq("release_id", releaseId)
    .order("created_at", { ascending: false })
    .returns<BuildSummaryRow[]>();

  if (error) {
    throw new Error(`Could not read the Builds of Release ${releaseId}: ${error.message}`);
  }

  return (data ?? []).map((build) => ({
    id: build.id,
    buildNumber: build.build_number,
    createdAt: build.created_at,
  }));
});

/** A Build, as seen from inside it. */
export type Build = {
  id: string;
  releaseId: string;
  buildNumber: string;
  description: string | null;
  createdAt: string;
};

type BuildRow = {
  id: string;
  release_id: string;
  build_number: string;
  description: string | null;
  created_at: string;
};

/**
 * The Build at that id, scoped to the Release the URL names — or a 404.
 *
 * Callers are expected to have already run `getRelease(projectId, releaseId)`, the same
 * deliberate-placeholder-turned-real guard `getRelease` itself describes relative to
 * `requireProjectMembership`. That call already proves the Release belongs to this Project and the
 * caller is a Member of it; the `release_id` match below is what stops a Build id from rendering under
 * the *wrong* Release — a Member of the Project could otherwise open
 * `/projects/P/releases/A/builds/<a Build id that belongs to Release B>` and see it presented as A's.
 */
export const getBuild = cache(async (releaseId: string, buildId: string): Promise<Build> => {
  await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("builds")
    .select("id, release_id, build_number, description, created_at")
    .eq("id", buildId)
    .eq("release_id", releaseId)
    .maybeSingle<BuildRow>();

  if (error) {
    throw new Error(`Could not read Build ${buildId}: ${error.message}`);
  }

  // No distinction between "no such Build", "not under this Release" and "not a Member of its
  // Project" — all three get the same answer, for the reason `getRelease` gives: drawing the
  // distinction is itself the disclosure.
  if (!data) notFound();

  return {
    id: data.id,
    releaseId: data.release_id,
    buildNumber: data.build_number,
    description: data.description,
    createdAt: data.created_at,
  };
});
