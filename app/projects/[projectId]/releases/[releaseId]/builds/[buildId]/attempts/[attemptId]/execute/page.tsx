import Link from "next/link";
import { redirect } from "next/navigation";

import { getBuild } from "@/lib/builds/dal";
import { formatDay } from "@/lib/dates";
import { listProjectPeople, requireProjectMembership } from "@/lib/projects/dal";
import { nameForPerson } from "@/lib/projects/people";
import { getRelease } from "@/lib/releases/dal";
import { getTestAttempt } from "@/lib/test-attempts/dal";
import { testResultMessages } from "@/lib/test-attempts/messages";

import { AttemptStatusChip } from "../../../_components/status-chips";
import { CompleteAttemptForm } from "./_components/complete-attempt-form";
import { ExecutionScreen } from "./_components/execution-screen";

/**
 * The Testing Execution Page. Every Case in the Attempt is shown with its frozen snapshot; recording
 * an Outcome or notes against one is `ExecutionScreen`'s own work, the interactive part of this page —
 * everything above it here is static, server-rendered context that doesn't change while a Member
 * works through the Attempt.
 *
 * A Completed Attempt has nothing left to execute — `protect_test_result_integrity` would refuse
 * every write anyway — so this redirects to the read-only Report rather than rendering a screen whose
 * controls would silently fail one by one.
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

  if (attempt.status === "Completed") {
    redirect(`/projects/${projectId}/releases/${release.id}/builds/${build.id}/attempts/${attempt.id}`);
  }

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
          <div className="flex items-center gap-xs">
            <AttemptStatusChip status={attempt.status} />
            <CompleteAttemptForm
              projectId={projectId}
              releaseId={release.id}
              buildId={build.id}
              attemptId={attempt.id}
            />
          </div>
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
