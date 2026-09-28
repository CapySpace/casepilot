import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProjectMembership } from "@/lib/projects/dal";

import { NewReleaseForm } from "./new-release-form";

/**
 * Creating a Release: a version, and two optional fields to say more about it.
 *
 * Any Member may create one — there is no Owner-only gate here, unlike a Project's own settings —
 * because day-to-day release record-keeping should not bottleneck on whoever happens to hold that Role.
 */
export default async function NewReleasePage({
  params,
}: PageProps<"/projects/[projectId]/releases/new">) {
  const { projectId } = await params;
  const project = await requireProjectMembership(projectId);

  return (
    <div className="w-full max-w-reading">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-headline-sm">Create a release</CardTitle>
          <CardDescription>
            A release is a version or milestone of {project.name} — for example{" "}
            <span className="font-mono">1.0.0</span> — that holds the builds produced under it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewReleaseForm projectId={project.id} />
        </CardContent>
      </Card>
    </div>
  );
}
