"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { testResultMessages } from "@/lib/test-attempts/messages";
import type { FailureOverviewEntry } from "@/lib/test-attempts/report";

import { FILTER_SELECT_CLASSES, OutcomeChip } from "../../_components/status-chips";

const FAILURE_FILTER_LABELS = { Both: "Failed and Blocked", Failed: "Failed only", Blocked: "Blocked only" } as const;
type FailureFilter = keyof typeof FAILURE_FILTER_LABELS;

/**
 * One `FailureOverviewEntry`, resolved into what a row can render directly — a Server Component can't
 * hand a Client Component a function (`nameFor`, an href-builder) across the boundary, so the caller
 * resolves the recorded-by line and the link target into plain strings first, the same way it already
 * resolves `nameFor` before rendering, not as a new pattern.
 */
export type FailureOverviewRow = {
  caseId: string;
  caseCode: string;
  caseTitle: string;
  outcome: FailureOverviewEntry["outcome"];
  recordedBy: string;
  href: string;
};

/**
 * The Build Report's Failure Overview: every Case whose latest Result is Failed or Blocked, sourced
 * independently of the summary cards above it (see `failedOrBlockedCases`'s own comment) — filtering
 * here narrows only this list, the same client-side technique `TestCasesSection` uses for its own
 * search and filter, never the summary numbers above it.
 */
export function FailureOverview({ rows }: { rows: FailureOverviewRow[] }) {
  const [filter, setFilter] = useState<FailureFilter>("Both");

  const filtered = useMemo(() => rows.filter((row) => filter === "Both" || row.outcome === filter), [rows, filter]);

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div className="flex items-center gap-xs">
          <h2 id="failure-overview-heading" className="font-heading text-title-lg">
            Failure Overview
          </h2>
          {rows.length > 0 && (
            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-body-sm tabular-nums text-muted-foreground">
              {rows.length}
            </span>
          )}
        </div>

        {rows.length > 0 && (
          <>
            <label className="sr-only" htmlFor="failure-overview-filter">
              Filter by Outcome
            </label>
            <select
              id="failure-overview-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value as FailureFilter)}
              className={FILTER_SELECT_CLASSES}
            >
              {(Object.entries(FAILURE_FILTER_LABELS) as [FailureFilter, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{testResultMessages.failureOverviewEmptyTitle}</CardTitle>
            <CardDescription>{testResultMessages.failureOverviewEmptyDescription}</CardDescription>
          </CardHeader>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-lg text-body-sm text-muted-foreground">
          {testResultMessages.failureOverviewNoMatchesForFilter}
        </div>
      ) : (
        <ul aria-labelledby="failure-overview-heading" className="flex flex-col gap-xs">
          {filtered.map((row) => (
            <li key={row.caseId}>
              <FailureRow row={row} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FailureRow({ row }: { row: FailureOverviewRow }) {
  return (
    <div className="group relative flex flex-col gap-xs rounded-xl border border-border bg-card p-md transition-colors hover:border-ring/60 hover:bg-accent/40 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div className="flex min-w-0 items-baseline gap-xs">
          <span className="font-mono text-body-sm text-reference">{row.caseCode}</span>
          <h3 className="truncate text-title-md font-semibold">
            <Link href={row.href} className="after:absolute after:inset-0 focus-visible:outline-none">
              {row.caseTitle}
            </Link>
          </h3>
        </div>
        <OutcomeChip outcome={row.outcome} />
      </div>

      <p className="text-body-sm tabular-nums text-muted-foreground">{row.recordedBy}</p>
    </div>
  );
}
