import { Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProjectMembership } from "@/lib/projects/dal";

/**
 * TEMPORARY, and only as far as ticket 03.
 *
 * Creating a Project has to land somewhere, and landing on the list would make creating and using a
 * Project two motions instead of one. So this exists to be that destination: the Project's name, its
 * description, and the guard that matters — a non-member gets a 404 here exactly as they will from
 * the finished Project pages.
 *
 * Ticket 03 replaces this with the overview, inside the sidebar shell the design draws, and adds the
 * Members and Settings pages beside it. Keep the `requireProjectMembership()` call.
 */
export default async function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const project = await requireProjectMembership(projectId);

  return (
    <>
      <h1 className="font-heading text-headline-md">{project.name}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{project.role === "owner" ? "You own this project" : "You are a member of this project"}</CardTitle>
          {project.description && <CardDescription>{project.description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-xs text-body-md text-muted-foreground">
          <p className="flex items-center gap-xs">
            <Users className="size-4" aria-hidden="true" />
            Members, invitations and settings arrive with the rest of this project in the next ticket.
          </p>
          <p>Releases, builds and test cases arrive in the next phase.</p>
        </CardContent>
      </Card>
    </>
  );
}
