import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProjectMembership } from "@/lib/projects/dal";
import { projectMessages } from "@/lib/projects/messages";

import { ProjectSettingsForm } from "./project-settings-form";

/**
 * Project settings, which both Roles may open and each sees only their own half of.
 *
 * An Owner gets the form. A Member gets the reason they do not, naming the Owner as the person who
 * can — not a disabled form, because a control you cannot use is worse than one that is not there.
 *
 * Leaving a Project belongs here too, and arrives with ticket 07. That is what gives a Member a reason
 * to open this page at all.
 */
export default async function ProjectSettingsPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const project = await requireProjectMembership(projectId);

  return (
    <>
      <h1 className="font-heading text-headline-md">Settings</h1>

      <Card className="max-w-reading">
        <CardHeader>
          <CardTitle>Project details</CardTitle>
          <CardDescription>
            The name and description everybody in this project sees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {project.role === "owner" ? (
            <ProjectSettingsForm
              projectId={project.id}
              details={{ name: project.name, description: project.description ?? "" }}
            />
          ) : (
            <div className="flex flex-col gap-xs text-body-md">
              <p className="text-muted-foreground">{projectMessages.onlyOwnerCanEdit}</p>
              <dl className="flex flex-col gap-2xs">
                <dt className="text-label-sm uppercase text-muted-foreground">Name</dt>
                <dd>{project.name}</dd>
                <dt className="mt-xs text-label-sm uppercase text-muted-foreground">Description</dt>
                <dd className="text-muted-foreground">
                  {project.description ?? "No description yet."}
                </dd>
              </dl>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
