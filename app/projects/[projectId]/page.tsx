import { CalendarDays, Users, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProjectMembership } from "@/lib/projects/dal";

/**
 * The Project overview: what this Project is, who is in it, and when it started.
 *
 * It says plainly that Releases, Builds and Cases are not here yet rather than drawing empty frames
 * for them. An empty frame promises something is coming today; a sentence is honest about the phase.
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
          {/*
            Formatted on the server, in one locale. A date formatted in the browser's locale would
            differ from the one rendered here and React would report the mismatch — and a project's
            start date is a fact, not a personalisation.
          */}
          Created{" "}
          {new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date(project.createdAt))}
        </Fact>
      </dl>

      <Card>
        <CardHeader>
          <CardTitle>Nothing to test here yet</CardTitle>
          <CardDescription>
            Releases, builds and test cases arrive in the next phase. For now a project holds its
            people.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-body-md text-muted-foreground">
          {/* Says what is coming, without telling anybody to press something that is not there. */}
          The member list and invitations arrive with the next two tickets.
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
