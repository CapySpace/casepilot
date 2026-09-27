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

/** One person in a Project, as the Members list shows them. */
export type ProjectPerson = {
  userId: string;
  fullName: string;
  email: string;
  role: ProjectRole;
  joinedAt: string;
};

type PersonRow = {
  user_id: string;
  full_name: string;
  email: string;
  role: ProjectRole;
  joined_at: string;
};

/**
 * Everybody in a Project: name, address, Role, and when they joined.
 *
 * Through `project_people` and nothing else. The two halves of a person live where a client cannot
 * join them — `profiles` is readable only by its own User, and the email address is in `auth.users`,
 * which no client may read at all — so that function is the only door, and its own first act is to
 * check that the caller is a member. See ADR-0003 for why it is allowed to read what it reads, and why
 * widening it would be a breach rather than a refactor.
 *
 * It returns the Owner first, then in joining order, because "who runs this" is the useful order for a
 * list of people. The ordering is the database's, so every reader gets the same one.
 */
export const listProjectPeople = cache(async (projectId: string): Promise<ProjectPerson[]> => {
  await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("project_people", { p_project_id: projectId });

  if (error) {
    throw new Error(`Could not read the people in Project ${projectId}: ${error.message}`);
  }

  // Cast at the boundary, not laziness: `.returns<PersonRow[]>()` — which is how `listMyProjects`
  // types its query — does not compile on `rpc()`. Measured against @supabase/supabase-js 2.117: the
  // helper unions the row type with `{ Error: "Type mismatch: Cannot cast single object to array
  // type…" }`, so `.map` does not exist on the result. Without generated database types the client
  // cannot know a function returns a set.
  //
  // The shape below is the migration's `returns table (...)`, and the RLS suite is what holds the two
  // together: it calls this function over the real API and asserts the columns.
  const rows = (data ?? []) as PersonRow[];

  return rows.map((person) => ({
    userId: person.user_id,
    fullName: person.full_name,
    email: person.email,
    role: person.role,
    joinedAt: person.joined_at,
  }));
});

/** An Invitation as its Owner sees it on the Members page. */
export type PendingInvitation = {
  id: string;
  email: string;
  invitedBy: string;
  expiresAt: string;
  expired: boolean;
};

type InvitationRow = {
  id: string;
  email: string;
  invited_by: string;
  expires_at: string;
};

/**
 * The Invitations still waiting on a Project, for its Owner.
 *
 * Only pending rows. An accepted Invitation is a person in the Members list above, and a cancelled one
 * is a decision already taken — neither is outstanding, which is the only thing this list is about.
 *
 * Expiry is computed here from `expires_at`, because that is where it lives: no row ever says
 * `expired`, so a stale Invitation keeps its `pending` status and is *shown* as expired. The database
 * has nothing to sweep and nothing to disagree with.
 *
 * Nothing is filtered by Project ownership here — row-level security allows only an Owner to select
 * these rows at all, so a Member's read returns nothing rather than being hidden by the page.
 */
export const listPendingInvitations = cache(
  async (projectId: string): Promise<PendingInvitation[]> => {
    // Stated rather than inherited. It was reached only through the `listProjectPeople` call below,
    // which is incidental: this module's contract is that every read establishes identity first, and a
    // contract kept by accident is one a later edit breaks silently.
    await verifySession();

    const supabase = await createClient();

    const [{ data, error }, people] = await Promise.all([
      supabase
        .from("project_invitations")
        .select("id, email, invited_by, expires_at")
        .eq("project_id", projectId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .returns<InvitationRow[]>(),
      listProjectPeople(projectId),
    ]);

    if (error) {
      throw new Error(`Could not read the Invitations of Project ${projectId}: ${error.message}`);
    }

    // Who invited them, by name. The inviter is a member of the Project, so they are in the list the
    // page already has — and `profiles` is readable only by its own User, so a join would come back
    // empty anyway.
    const names = new Map(people.map((person) => [person.userId, person.fullName]));
    const now = Date.now();

    return (data ?? []).map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      invitedBy: names.get(invitation.invited_by) ?? "a former member",
      expiresAt: invitation.expires_at,
      expired: new Date(invitation.expires_at).getTime() <= now,
    }));
  },
);
