import { CalendarDays, Users, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDay } from "@/lib/dates";
import { requireProjectMembership } from "@/lib/projects/dal";

/**
 * The Project overview: what this Project is, who is in it, and when it started.
 *
 * It says plainly that test cases are not here yet rather than drawing an empty frame for them. An
 * empty frame promises something is coming today; a sentence is honest about the phase. Releases and
 * Builds have both arrived — see the sidebar — so neither is named among what is missing any more.
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

      <Card>
        <CardHeader>
          <CardTitle>Nothing to test here yet</CardTitle>
          <CardDescription>
            Test cases arrive next. For now a project holds its people, the releases they are tracking,
            and the builds recorded under them.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-body-md text-muted-foreground">
          Invite the colleagues who will be testing with you from the members page.
        </CardContent>
      </Card>
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
