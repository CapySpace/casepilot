import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBuild } from "@/lib/builds/dal";
import { formatDay } from "@/lib/dates";
import { listProjectPeople, requireProjectMembership } from "@/lib/projects/dal";
import { nameForPerson } from "@/lib/projects/people";
import { getRelease } from "@/lib/releases/dal";
import { listTestAttemptsForReport } from "@/lib/test-attempts/dal";
import { testResultMessages } from "@/lib/test-attempts/messages";
import { buildReportMetrics, failedOrBlockedCases } from "@/lib/test-attempts/report";
import { listReadyTestCaseIds, listTestCases } from "@/lib/test-cases/dal";

import { ProgressBar } from "../_components/progress-bar";
import { CompletionIndicator } from "./_components/completion-indicator";
import { FailureOverview, type FailureOverviewRow } from "./_components/failure-overview";
import { SummaryCards } from "./_components/summary-cards";

/**
 * The Build Report: this Build's testing state at a glance, computed live from its `Ready` Cases and
 * every Attempt taken against it — no stored statistics, per the phase's own brief. Later tickets add
 * Recent Results and Tester Activity sections below this one; this ticket is the summary, completion
 * indicator, Outcome breakdown and Failure Overview they'll sit beneath.
 *
 * `getRelease` then `getBuild` run first, the same layering every other page under `[buildId]` uses.
 * The Failure Overview is sourced from every Case regardless of Status, not just the Ready ones the
 * summary counts — see `failedOrBlockedCases`'s own comment — so it renders independently of the "no
 * Ready Cases" empty state below rather than inside it.
 */
export default async function BuildReportPage({
  params,
}: PageProps<"/projects/[projectId]/releases/[releaseId]/builds/[buildId]/report">) {
  const { projectId, releaseId, buildId } = await params;
  await requireProjectMembership(projectId);
  const release = await getRelease(projectId, releaseId);
  const build = await getBuild(release.id, buildId);

  const readyCaseIds = await listReadyTestCaseIds(build.id);
  const attempts = await listTestAttemptsForReport(build.id);
  const metrics = buildReportMetrics(readyCaseIds, attempts);

  const allCases = await listTestCases(build.id);
  const failures = failedOrBlockedCases(allCases, attempts);

  const people = await listProjectPeople(projectId);
  const nameFor = (userId: string) => nameForPerson(people, userId, testResultMessages.personNoLongerInProject);

  const buildHref = `/projects/${projectId}/releases/${release.id}/builds/${build.id}`;

  // Resolved into plain strings here, on the server: a Client Component (`FailureOverview`, for its
  // filter state) can't accept a function prop like `nameFor` or an href-builder across the boundary.
  const failureRows: FailureOverviewRow[] = failures.map((entry) => ({
    caseId: entry.caseId,
    caseCode: entry.caseCode,
    caseTitle: entry.caseTitle,
    outcome: entry.outcome,
    recordedBy:
      entry.executedBy && entry.executedAt
        ? `Recorded by ${nameFor(entry.executedBy)} on ${formatDay(entry.executedAt)}`
        : testResultMessages.notYetRecorded,
    href: `${buildHref}/attempts/${entry.attemptId}#result-${entry.resultId}`,
  }));

  return (
    <>
      <div className="flex flex-col gap-2xs border-b border-border pb-lg">
        <Link
          href={buildHref}
          className="font-mono text-body-sm text-muted-foreground hover:text-reference hover:underline"
        >
          Build {build.buildNumber}
        </Link>
        <h1 className="font-heading text-headline-md font-semibold">Report</h1>
      </div>

      {metrics.total === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{testResultMessages.noReadyCasesTitle}</CardTitle>
            <CardDescription>{testResultMessages.noReadyCasesDescription}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-lg">
          <SummaryCards metrics={metrics} />
          <CompletionIndicator percent={metrics.completionPercent} />
          <ProgressBar
            tested={metrics.tested}
            total={metrics.total}
            breakdown={metrics.breakdown}
            notTested={metrics.notTested}
          />
        </div>
      )}

      <FailureOverview rows={failureRows} />
    </>
  );
}
