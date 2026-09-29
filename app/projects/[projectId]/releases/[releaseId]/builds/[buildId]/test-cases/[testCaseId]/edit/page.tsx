import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBuild } from "@/lib/builds/dal";
import { requireProjectMembership } from "@/lib/projects/dal";
import { getRelease } from "@/lib/releases/dal";
import { getTestCase } from "@/lib/test-cases/dal";

import { EditTestCaseForm } from "./edit-test-case-form";

/** Editing a Case: the same form Create uses, pre-filled with what is already saved. */
export default async function EditTestCasePage({
  params,
}: PageProps<"/projects/[projectId]/releases/[releaseId]/builds/[buildId]/test-cases/[testCaseId]/edit">) {
  const { projectId, releaseId, buildId, testCaseId } = await params;
  await requireProjectMembership(projectId);
  const release = await getRelease(projectId, releaseId);
  const build = await getBuild(release.id, buildId);
  const testCase = await getTestCase(build.id, testCaseId);

  return (
    <div className="w-full max-w-reading">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-headline-sm">Edit {testCase.code}</CardTitle>
          <CardDescription>Update what this test case verifies, and how.</CardDescription>
        </CardHeader>
        <CardContent>
          <EditTestCaseForm
            projectId={projectId}
            releaseId={release.id}
            buildId={build.id}
            testCase={testCase}
          />
        </CardContent>
      </Card>
    </div>
  );
}
