import { CalendarDays, Users, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { formatDay } from "@/lib/dates";
import { requireProjectMembership } from "@/lib/projects/dal";

/**
 * The Project overview: what this Project is, who is in it, and when it started.
 *
 * There is no longer a card naming something still missing: Releases, Builds and Cases have all
 * arrived — see the sidebar — so nothing about this hierarchy is left for the Overview to apologise
 * for. The next gap (test execution) belongs to a Build's own page, not this one, when it arrives.
 */
export default async function ProjectOverviewPage({
  params,
}: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const project = await requireProjectMembership(projectId);

  return (
    <>
      <div className="flex flex-col gap-2xs">
        <h1 className="font-heading text-headline-md">{project.name}</h1>
        <p className="text-body-md text-muted-foreground">
          {project.description ?? "No description yet."}
        </p>
      </div>

      <dl className="flex flex-wrap gap-lg">
        <Fact icon={Users} label="People">
          {project.memberCount} {project.memberCount === 1 ? "member" : "members"}
        </Fact>
        <Fact icon={CalendarDays} label="Started">
          Created {formatDay(project.createdAt)}
        </Fact>
      </dl>

      <p className="text-body-md text-muted-foreground">
        Invite the colleagues who will be testing with you from the members page.
      </p>
    </>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2xs">
      <dt className="text-label-sm uppercase text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-xs text-body-md tabular-nums">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        {children}
      </dd>
    </div>
  );
}
