import type { ReactNode } from "react";

import type { BuildReportMetrics } from "@/lib/test-attempts/report";

import { OUTCOME_TOKENS, StatusDot } from "../../_components/status-chips";

/**
 * The Build Report's summary row — the original brief's own worked example (Total, Tested, Passed,
 * Failed, Blocked, Skipped, Not Tested, Completion), plus Pass Rate. Not Tested here is the folded
 * summary number (`notTestedForSummary`, Not Run plus true Not Tested combined) — the finer
 * distinction lives in the Outcome breakdown bar below this component, not here.
 */
export function SummaryCards({ metrics }: { metrics: BuildReportMetrics }) {
  return (
    <dl className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
      <StatCard label="Total Test Cases">{metrics.total}</StatCard>
      <StatCard label="Tested">{metrics.tested}</StatCard>
      <StatCard label="Passed" dotClass={OUTCOME_TOKENS.Passed.dot}>
        {metrics.breakdown.Passed}
      </StatCard>
      <StatCard label="Failed" dotClass={OUTCOME_TOKENS.Failed.dot}>
        {metrics.breakdown.Failed}
      </StatCard>
      <StatCard label="Blocked" dotClass={OUTCOME_TOKENS.Blocked.dot}>
        {metrics.breakdown.Blocked}
      </StatCard>
      <StatCard label="Skipped" dotClass={OUTCOME_TOKENS.Skipped.dot}>
        {metrics.breakdown.Skipped}
      </StatCard>
      <StatCard label="Not Tested" dotClass={OUTCOME_TOKENS["Not Run"].dot}>
        {metrics.notTestedForSummary}
      </StatCard>
      <StatCard label="Completion">{metrics.completionPercent.toFixed(1)}%</StatCard>
      <StatCard label="Pass Rate">{metrics.passRate.toFixed(1)}%</StatCard>
    </dl>
  );
}

function StatCard({ label, dotClass, children }: { label: string; dotClass?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2xs rounded-xl border border-border bg-card p-md">
      <dt className="flex items-center gap-1.5 text-label-sm uppercase text-muted-foreground">
        {dotClass && <StatusDot className={dotClass} />}
        {label}
      </dt>
      <dd className="text-title-lg font-semibold tabular-nums">{children}</dd>
    </div>
  );
}
