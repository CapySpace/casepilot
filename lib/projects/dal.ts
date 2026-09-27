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

/**
 * Reading the single row PostgREST wraps an embedded aggregate in.
 *
 * It throws rather than falling back to zero, because every number on these pages is a claim about a
 * Project: "0 members" for a Project the caller is standing inside is a visible lie, and a lie is
 * worse than a page that fails. The same argument as the count being an aggregate in the first place.
 */
function countOf(project: { members: { count: number }[] }): number {
  const members = project.members[0];
  if (!members) throw new Error("Membership count missing from the Projects query");

  return members.count;
}

function roleOf(project: { id: string; mine: { role: ProjectRole }[] }): ProjectRole {
  const membership = project.mine[0];
  if (!membership) throw new Error(`No Membership came back for Project ${project.id}`);

  return membership.role;
}

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
    role: roleOf(project),
    memberCount: countOf(project),
  }));
});

/** A Project, as seen from inside it. */
export type Project = {
  id: string;
  name: string;
  description: string | null;
  role: ProjectRole;
  memberCount: number;
  createdAt: string;
};

type MembershipRow = {
  role: ProjectRole;
  project: {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    members: { count: number }[];
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
    .select(
      "role, project:projects!inner(id, name, description, created_at, members:project_members(count))",
    )
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
    memberCount: countOf(data.project),
    createdAt: data.project.created_at,
  };
});

/**
 * The Project at that id, if the caller owns it — and a 404 otherwise, for a non-member and a Member
 * alike.
 *
 * A Member being told "you are not the owner" would be a truthful answer to a question they should not
 * be able to ask from a URL, so the two refusals are deliberately the same one. The interface does not
 * offer them the page, row-level security refuses the write behind it, and this refuses the render.
 */
export const requireProjectOwnership = cache(async (projectId: string): Promise<Project> => {
  const project = await requireProjectMembership(projectId);

  if (project.role !== "owner") notFound();

  return project;
});
