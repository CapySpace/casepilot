import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBuild } from "@/lib/builds/dal";
import { requireProjectMembership } from "@/lib/projects/dal";
import { getRelease } from "@/lib/releases/dal";

import { NewTestCaseForm } from "./new-test-case-form";

/**
 * Creating a Case: a title, the usual optional context, an ordered list of steps, and where it sits on
 * priority and status. A dedicated page rather than a toggle on Build Details — see the spec — because
 * a steps builder is substantial enough that a details page hosting it inline would stop being one.
 */
export default async function NewTestCasePage({
  params,
}: PageProps<"/projects/[projectId]/releases/[releaseId]/builds/[buildId]/test-cases/new">) {
  const { projectId, releaseId, buildId } = await params;
  await requireProjectMembership(projectId);
  const release = await getRelease(projectId, releaseId);
  const build = await getBuild(release.id, buildId);

  return (
    <div className="w-full max-w-reading">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-headline-sm">New test case</CardTitle>
          <CardDescription>
            What to verify on Build {build.buildNumber}, and the steps to verify it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewTestCaseForm projectId={projectId} releaseId={release.id} buildId={build.id} />
        </CardContent>
      </Card>
    </div>
  );
}
