import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDay } from "@/lib/dates";
import {
  listPendingInvitations,
  listProjectPeople,
  requireProjectMembership,
} from "@/lib/projects/dal";

import { RoleLabel } from "../../_components/role-label";
import { InviteForm } from "./_components/invite-form";
import { PendingInvitations } from "./_components/pending-invitations";
import { RemoveMember } from "./_components/remove-member";

/**
 * Who is in this Project.
 *
 * Every Member sees the list, not only the Owner: knowing who else is testing is part of working
 * together, and this is the page somebody opens to find out who to ask.
 *
 * Inviting, and the Invitations still waiting, belong to the Owner alone — and are *absent* for a
 * Member rather than disabled. Row-level security says the same thing underneath: a Member's read of
 * `project_invitations` returns nothing at all, so there is no list to hide. Removing somebody arrives
 * with ticket 07.
 *
 * A table, because this is tabular: several people and four facts about each, read down as much as
 * across. DESIGN.md §4's treatment, less one part of it: porcelain header, slate column labels,
 * hairline dividers, generous rows — but the header is **not** sticky.
 *
 * Sticky needs something that scrolls, and a Project's people are a handful of rows inside a card that
 * does not. The design's sticky header is written for the Cases table of a later phase, which will have
 * a hundred rows and a scroll container to go with them; adding the class here would be a claim the
 * markup cannot honour.
 */
export default async function ProjectMembersPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;

  // Sequential on purpose. `project_people` guards itself — that check is "the whole of its safety",
  // as ADR-0003 puts it — but deciding membership *before* asking for the people means the guard is
  // the second line of defence rather than the only one. It costs no query: the layout above has
  // already resolved this and `cache` dedupes it within the request.
  const project = await requireProjectMembership(projectId);
  const people = await listProjectPeople(projectId);
  // Asked for everybody, answered for the Owner. Row-level security allows only an Owner to select these
  // rows, so a Member's read comes back empty on its own — and the page not deciding is the point: "a
  // page that filters is a page that can forget to".
  const invitations = await listPendingInvitations(projectId);
  const viewerIsOwner = project.role === "owner";

  return (
    <>
      <div className="flex flex-col gap-2xs">
        <h1 id="members-heading" className="font-heading text-headline-md">
          Members
        </h1>
        <p className="text-body-md text-muted-foreground">
          {/*
            Counted from the list itself, not from the Membership aggregate the overview uses. Two
            sources for one number can disagree — a Membership whose profile row was missing would be
            counted here and absent below — and a heading that contradicts the rows under it is worse
            than no heading.
          */}
          <span className="tabular-nums">{people.length}</span>{" "}
          {people.length === 1 ? "member" : "members"} of {project.name}
        </p>
      </div>

      {/* `py-0` because the table's own cells carry the padding, and a card's vertical rhythm on top of
          them would double it. */}
      <Card className="py-0">
        <table aria-labelledby="members-heading" className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-background">
              <HeaderCell>Name</HeaderCell>
              <HeaderCell>Role</HeaderCell>
              {/* `md:` is 768px, which is where DESIGN.md §5 puts the end of mobile. Tailwind's `sm:`
                  would drop the column 127px early, the same mistake the sidebar's breakpoint token
                  exists to avoid. */}
              <HeaderCell className="hidden md:table-cell">Joined</HeaderCell>
              {/* The label hides, not the cell: `sr-only` is absolutely positioned, so putting it on the
                  `th` would lift the header cell out of a row whose body cells stay put. The column holds
                  one control per row, each named for the person it acts on. */}
              {viewerIsOwner && (
                <HeaderCell>
                  <span className="sr-only">Actions</span>
                </HeaderCell>
              )}
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.userId} className="border-b border-border last:border-0">
                {/* The person is what each row is *about*, so the name is its header rather than one
                    more cell: a screen reader then announces whose Role and date it is reading. */}
                <th scope="row" className={`${CELL} font-normal`}>
                  <div className="flex flex-col gap-2xs">
                    <span className="text-body-md">{person.fullName}</span>
                    {/* Monospace because an address is a reference you copy, which is the job
                        DESIGN.md §3 gives the monospace face. */}
                    <span className="font-mono text-body-sm text-muted-foreground">
                      {person.email}
                    </span>
                    {/* The Joined column, for the narrow screens that drop it. */}
                    <span className="text-body-sm text-muted-foreground tabular-nums md:hidden">
                      Joined {formatDay(person.joinedAt)}
                    </span>
                  </div>
                </th>
                <td className={`${CELL} align-top`}>
                  <RoleLabel role={person.role} />
                </td>
                <td
                  className={`${CELL} hidden align-top text-body-sm text-muted-foreground tabular-nums md:table-cell`}
                >
                  {formatDay(person.joinedAt)}
                </td>
                {viewerIsOwner && (
                  <td className={`${CELL} align-top text-right`}>
                    {/* Not on their own row: an Owner cannot remove themselves, and the database refuses it
                        as well — see the policies in the leaving migration. */}
                    {person.role === "owner" ? null : (
                      <RemoveMember
                        projectId={project.id}
                        userId={person.userId}
                        name={person.fullName}
                      />
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {viewerIsOwner && (
        <>
          <Card className="max-w-reading">
            <CardHeader>
              <CardTitle>Invite a colleague</CardTitle>
              <CardDescription>
                Creating an invitation gives you a single-use link. CasePilot does not send it —
                forward it however you normally reach them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteForm
                projectId={project.id}
                waitingFor={invitations.map((invitation) => invitation.email)}
              />
            </CardContent>
          </Card>

          <Card className="max-w-reading">
            <CardHeader>
              <CardTitle>Waiting to accept</CardTitle>
              <CardDescription>
                Invitations expire after seven days. Cancelling one stops its link working.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PendingInvitations projectId={project.id} invitations={invitations} />
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

/** §5's table interior: 0.75rem vertically, the 1rem gutter horizontally. */
const CELL = "px-md py-sm";

function HeaderCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th scope="col" className={`${CELL} text-label-sm uppercase text-muted-foreground ${className}`}>
      {children}
    </th>
  );
}
