import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getBuild } from "@/lib/builds/dal";
import { formatDay } from "@/lib/dates";
import { listProjectPeople, requireProjectMembership } from "@/lib/projects/dal";
import { nameForPerson } from "@/lib/projects/people";
import { getRelease } from "@/lib/releases/dal";
import { outcomeBreakdown } from "@/lib/test-attempts/breakdown";
import { getTestAttempt, type TestResultDetail } from "@/lib/test-attempts/dal";
import { testResultMessages } from "@/lib/test-attempts/messages";

import { AttemptStatusChip, OutcomeChip } from "../../_components/status-chips";
import { ProgressBar } from "../../_components/progress-bar";
import { DeleteAttempt } from "../_components/delete-attempt";

/**
 * The Attempt Report: a read-only summary reachable whatever the Attempt's Status. For a Completed
 * Attempt this is its permanent record; for one still `In Progress` it's the same view a colleague can
 * check on without touching the execution screen, which is why it links onward to `/execute` rather
 * than duplicating any of its controls.
 *
 * `getRelease` then `getBuild` run first, the same layering every other page under `[buildId]` uses,
 * before `getTestAttempt` adds the last link: that this Attempt belongs to this Build.
 */
export default async function TestAttemptReportPage({
  params,
}: PageProps<"/projects/[projectId]/releases/[releaseId]/builds/[buildId]/attempts/[attemptId]">) {
  const { projectId, releaseId, buildId, attemptId } = await params;
  await requireProjectMembership(projectId);
  const release = await getRelease(projectId, releaseId);
  const build = await getBuild(release.id, buildId);
  const attempt = await getTestAttempt(build.id, attemptId);

  const people = await listProjectPeople(projectId);
  const nameFor = (userId: string) => nameForPerson(people, userId, testResultMessages.personNoLongerInProject);

  const buildHref = `/projects/${projectId}/releases/${release.id}/builds/${build.id}`;
  const executeHref = `${buildHref}/attempts/${attempt.id}/execute`;

  const breakdown = outcomeBreakdown(attempt.results);
  const tested = attempt.results.length - breakdown["Not Run"];
  const inProgress = attempt.status === "In Progress";

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
            {inProgress && (
              <>
                <Button asChild variant="secondary" size="sm">
                  <Link href={executeHref}>Continue</Link>
                </Button>
                <DeleteAttempt
                  projectId={projectId}
                  releaseId={release.id}
                  buildId={build.id}
                  attemptId={attempt.id}
                  attemptNumber={attempt.attemptNumber}
                />
              </>
            )}
          </div>
        </div>

        <p className="text-body-sm text-muted-foreground tabular-nums">
          Started by {nameFor(attempt.createdBy)} on {formatDay(attempt.startedAt)}
          {attempt.completedAt && <> · Completed {formatDay(attempt.completedAt)}</>}
        </p>
      </div>

      <ProgressBar tested={tested} total={attempt.results.length} breakdown={breakdown} />

      {attempt.results.length === 0 ? (
        <p className="text-body-md text-muted-foreground">This Attempt has no Cases recorded against it.</p>
      ) : (
        <ol className="flex flex-col gap-sm">
          {attempt.results.map((result) => (
            <li key={result.id}>
              <ReportResultRow result={result} nameFor={nameFor} />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function ReportResultRow({
  result,
  nameFor,
}: {
  result: TestResultDetail;
  nameFor: (userId: string) => string;
}) {
  return (
    <div className="flex flex-col gap-xs rounded-xl border border-border bg-card p-md">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div className="flex min-w-0 items-baseline gap-xs">
          <span className="font-mono text-body-sm text-reference">{result.testCaseCode}</span>
          <span className="truncate text-title-md font-semibold">{result.titleSnapshot}</span>
        </div>
        <OutcomeChip outcome={result.outcome} />
      </div>

      <p className="whitespace-pre-wrap text-body-md text-muted-foreground">
        {result.notes || testResultMessages.noNotesRecorded}
      </p>

      <p className="text-body-sm text-muted-foreground tabular-nums">
        {result.executedBy && result.executedAt
          ? `Recorded by ${nameFor(result.executedBy)} on ${formatDay(result.executedAt)}`
          : testResultMessages.notYetRecorded}
      </p>
    </div>
  );
}
