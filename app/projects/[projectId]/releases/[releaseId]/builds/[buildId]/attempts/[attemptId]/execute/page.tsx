import Link from "next/link";

import { getBuild } from "@/lib/builds/dal";
import { formatDay } from "@/lib/dates";
import { listProjectPeople, requireProjectMembership } from "@/lib/projects/dal";
import { nameForPerson } from "@/lib/projects/people";
import { getRelease } from "@/lib/releases/dal";
import { getTestAttempt } from "@/lib/test-attempts/dal";
import { testResultMessages } from "@/lib/test-attempts/messages";

import { AttemptStatusChip } from "../../../_components/status-chips";
import { ExecutionScreen } from "./_components/execution-screen";

/**
 * The Testing Execution Page. Every Case in the Attempt is shown with its frozen snapshot; recording
 * an Outcome or notes against one is `ExecutionScreen`'s own work, the interactive part of this page —
 * everything above it here is static, server-rendered context that doesn't change while a Member
 * works through the Attempt.
 *
 * `getRelease` then `getBuild` run first, the same layering every other page under `[buildId]` uses,
 * before `getTestAttempt` adds the last link: that this Attempt belongs to this Build.
 */
export default async function TestAttemptExecutionPage({
  params,
}: PageProps<"/projects/[projectId]/releases/[releaseId]/builds/[buildId]/attempts/[attemptId]/execute">) {
  const { projectId, releaseId, buildId, attemptId } = await params;
  await requireProjectMembership(projectId);
  const release = await getRelease(projectId, releaseId);
  const build = await getBuild(release.id, buildId);
  const attempt = await getTestAttempt(build.id, attemptId);

  const people = await listProjectPeople(projectId);
  const nameFor = (userId: string) => nameForPerson(people, userId, testResultMessages.personNoLongerInProject);

  const buildHref = `/projects/${projectId}/releases/${release.id}/builds/${build.id}`;

  return (
    <>
      <div className="flex flex-col gap-md border-b border-border pb-lg">
        <Link
          href={buildHref}
          className="font-mono text-body-sm text-muted-foreground hover:text-reference hover:underline"
        >
          Build {build.buildNumber}
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-md">
          <h1 className="font-heading text-headline-md font-semibold">
            {testResultMessages.attemptLabel(attempt.attemptNumber)}
          </h1>
          <AttemptStatusChip status={attempt.status} />
        </div>

        <p className="text-body-sm text-muted-foreground tabular-nums">
          Started by {nameFor(attempt.createdBy)} on {formatDay(attempt.startedAt)}
        </p>
      </div>

      <ExecutionScreen
        projectId={projectId}
        releaseId={release.id}
        buildId={build.id}
        initialResults={attempt.results}
        people={people}
        personNoLongerInProject={testResultMessages.personNoLongerInProject}
      />
    </>
  );
}
