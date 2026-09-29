import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getBuild } from "@/lib/builds/dal";
import { formatDay } from "@/lib/dates";
import { listProjectPeople, requireProjectMembership } from "@/lib/projects/dal";
import { nameForPerson } from "@/lib/projects/people";
import { getRelease } from "@/lib/releases/dal";
import { listTestAttempts } from "@/lib/test-attempts/dal";
import { testResultMessages } from "@/lib/test-attempts/messages";
import { listTestCases } from "@/lib/test-cases/dal";

import { TestCasesSection } from "./_components/test-cases-section";
import { TestingAttemptsSection } from "./_components/testing-attempts-section";

/**
 * A Build, on its own: its number and description in full, and the Cases recorded against it.
 *
 * `getRelease` runs first, the same layering `getBuild`'s own comment describes: it is what proves
 * this Release belongs to this Project and the caller is a Member of it, before `getBuild` adds the
 * next link — that this Build belongs to this Release.
 */
export default async function BuildDetailsPage({
  params,
}: PageProps<"/projects/[projectId]/releases/[releaseId]/builds/[buildId]">) {
  const { projectId, releaseId, buildId } = await params;
  await requireProjectMembership(projectId);
  const release = await getRelease(projectId, releaseId);
  const build = await getBuild(release.id, buildId);
  const testCases = await listTestCases(build.id);
  const testAttempts = await listTestAttempts(build.id);

  // The only door onto a Member's name from another Member's page — see `listProjectPeople`'s own
  // comment on why `project_people` is the one deliberate widening of the definer pattern.
  const people = await listProjectPeople(projectId);
  const nameFor = (userId: string) => nameForPerson(people, userId, testResultMessages.personNoLongerInProject);

  const newTestCaseHref = `/projects/${projectId}/releases/${release.id}/builds/${build.id}/test-cases/new`;

  return (
    <>
      <div className="flex flex-col gap-2xs border-b border-border pb-lg">
        <Link
          href={`/projects/${projectId}/releases/${release.id}`}
          className="font-mono text-body-sm text-muted-foreground hover:text-reference hover:underline"
        >
          {release.version}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-md">
          <h1 className="font-mono text-headline-md font-semibold text-reference">
            Build {build.buildNumber}
          </h1>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/projects/${projectId}/releases/${release.id}/builds/${build.id}/report`}>
              View Report
            </Link>
          </Button>
        </div>
      </div>

      <p className="text-body-md text-muted-foreground">
        {build.description || "No description yet."}
      </p>
      <p className="text-body-sm text-muted-foreground tabular-nums">Created {formatDay(build.createdAt)}</p>

      <TestingAttemptsSection
        attempts={testAttempts}
        hasEligibleCases={testCases.length > 0}
        nameFor={nameFor}
        projectId={projectId}
        releaseId={release.id}
        buildId={build.id}
      />

      <TestCasesSection
        testCases={testCases}
        newTestCaseHref={newTestCaseHref}
        projectId={projectId}
        releaseId={release.id}
        buildId={build.id}
      />
    </>
  );
}
