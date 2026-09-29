import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBuild } from "@/lib/builds/dal";
import { requireProjectMembership } from "@/lib/projects/dal";
import { getRelease } from "@/lib/releases/dal";
import { listTestAttemptsForReport } from "@/lib/test-attempts/dal";
import { testResultMessages } from "@/lib/test-attempts/messages";
import { buildReportMetrics } from "@/lib/test-attempts/report";
import { listReadyTestCaseIds } from "@/lib/test-cases/dal";

import { ProgressBar } from "../_components/progress-bar";
import { CompletionIndicator } from "./_components/completion-indicator";
import { SummaryCards } from "./_components/summary-cards";

/**
 * The Build Report: this Build's testing state at a glance, computed live from its `Ready` Cases and
 * every Attempt taken against it — no stored statistics, per the phase's own brief. Later tickets add
 * the Failure Overview, Recent Results and Tester Activity sections below this one; this ticket is the
 * summary, completion indicator and Outcome breakdown they'll all sit beneath.
 *
 * `getRelease` then `getBuild` run first, the same layering every other page under `[buildId]` uses.
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

  const buildHref = `/projects/${projectId}/releases/${release.id}/builds/${build.id}`;

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
    </>
  );
}
