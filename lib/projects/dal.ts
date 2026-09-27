import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * Reading Projects, on the authenticated side of the boundary.
 *
 * Every function here goes through `verifySession()` first, so the identity is the provider's answer
 * and not the browser's claim (ADR-0002). Row-level security is what decides which rows come back;
 * these functions do not filter for visibility, and must not start — a page that filters is a page
 * that can forget to.
 */

export type ProjectRole = "owner" | "member";

/** One row of the Projects list. */
export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  role: ProjectRole;
  memberCount: number;
};

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  /** The aggregate, counted by the database. PostgREST returns it as a single-element array. */
  members: { count: number }[];
  /** The caller's own Membership — which is why the query filters this embed to them. */
  mine: { role: ProjectRole }[];
};

/**
 * The Projects the signed-in User belongs to, with their own Role and how many people are in each.
 *
 * The count is an aggregate the database computes, not rows counted here, and that is not an
 * optimisation: PostgREST caps a response at `max_rows` (1000, in `supabase/config.toml`), so
 * counting returned rows would quietly start under-reporting on a busy installation — and a count
 * that came back short is indistinguishable from a small Project.
 *
 * The `mine` embed is filtered to the caller because it answers "what am *I* in this Project". It
 * does not decide which Projects are visible; row-level security does, which is why a Project
 * somebody else owns is absent from this result rather than filtered out of it.
 *
 * Ordered by name, by the database. A list you scan wants to be alphabetical.
 */
export const listMyProjects = cache(async (): Promise<ProjectSummary[]> => {
  const user = await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, name, description, members:project_members(count), mine:project_members!inner(role)",
    )
    .eq("mine.user_id", user.id)
    .order("name", { ascending: true })
    .returns<ProjectRow[]>();

  // Thrown rather than swallowed. A list that renders empty because its query failed looks exactly
  // like a User with no Projects, and telling those two apart is the whole meaning of this page.
  if (error) {
    throw new Error(`Could not read the Projects of User ${user.id}: ${error.message}`);
  }

  return (data ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    role: project.mine[0].role,
    memberCount: project.members[0].count,
  }));
});

/** A Project, as seen from inside it. */
export type Project = {
  id: string;
  name: string;
  description: string | null;
  role: ProjectRole;
};

type MembershipRow = {
  role: ProjectRole;
  project: {
    id: string;
    name: string;
    description: string | null;
  };
};

/**
 * The Project at that id, or a 404.
 *
 * A non-member gets `notFound()` — not a redirect, and not a page explaining they lack access.
 * "This Project exists but is not yours" is itself a disclosure: Project ids travel in URLs, and a
 * distinguishable refusal would let somebody map which ids are real. Row-level security returns no
 * rows either way, so the 404 is the truthful rendering of what the database said.
 *
 * Ticket 03 adds the Owner-only counterpart, which this will grow beside.
 */
export const requireProjectMembership = cache(async (projectId: string): Promise<Project> => {
  const user = await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_members")
    .select("role, project:projects!inner(id, name, description)")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .maybeSingle<MembershipRow>();

  // A failed query is not a missing Project. Turning a dropped connection into a 404 would tell a
  // Member their own Project had gone, which is untrue and alarming in equal measure.
  if (error) {
    throw new Error(`Could not read Project ${projectId}: ${error.message}`);
  }

  // No distinction between "no such Project", "not a member" and a malformed id. All three get the
  // same answer, because drawing the distinction *is* the disclosure.
  if (!data) notFound();

  return {
    id: data.project.id,
    name: data.project.name,
    description: data.project.description,
    role: data.role,
  };
});
