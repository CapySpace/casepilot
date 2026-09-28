import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProjectMembership } from "@/lib/projects/dal";
import { projectMessages } from "@/lib/projects/messages";

import { LeaveProject } from "./leave-project";
import { ProjectSettingsForm } from "./project-settings-form";

/**
 * Project settings, which both Roles may open and each sees only their own half of.
 *
 * An Owner gets the form. A Member gets the reason they do not, naming the Owner as the person who
 * can — not a disabled form, because a control you cannot use is worse than one that is not there.
 *
 * Leaving belongs here too, which is what gives a Member a reason to open this page at all. An Owner is
 * told why they have no Leave control rather than shown a disabled one — the reason is the useful part, and
 * it names what would have to exist first.
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
      <Card className="max-w-reading">
        <CardHeader>
          <CardTitle>Leaving</CardTitle>
          <CardDescription>
            Membership is what makes a project visible to you. Leaving ends that.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {project.role === "owner" ? (
            <p className="text-body-md text-muted-foreground">{projectMessages.ownerCannotLeave}</p>
          ) : (
            <LeaveProject projectId={project.id} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
