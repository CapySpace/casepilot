import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { formatDay } from "@/lib/dates";
import { listProjectPeople, requireProjectMembership } from "@/lib/projects/dal";

import { RoleLabel } from "../../_components/role-label";

/**
 * Who is in this Project.
 *
 * Every Member sees it, not only the Owner: knowing who else is testing is part of working together,
 * and this is the page somebody opens to find out who to ask. The Owner's own controls — inviting,
 * cancelling an Invitation, removing somebody — arrive with tickets 05 and 07.
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
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
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
