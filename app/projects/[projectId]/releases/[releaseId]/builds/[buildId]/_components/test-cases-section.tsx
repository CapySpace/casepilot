"use client";

import { ChevronRight, ClipboardList, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TestCaseSummary } from "@/lib/test-cases/dal";
import {
  TEST_CASE_PRIORITIES,
  TEST_CASE_STATUSES,
  type TestCasePriority,
  type TestCaseStatus,
} from "@/lib/test-cases/validation";

import { Chip, FILTER_SELECT_CLASSES } from "./status-chips";

/** The unfiltered value for each `<select>` — never a real Priority or Status, so a plain string. */
const ANY = "";

/**
 * The Test Cases section of Build Details: the list ticket 02 built, now searchable and filterable.
 *
 * Search and both filters are client-side over the Build's already-fetched Cases — the same technique
 * `release-search-context.tsx` uses for Releases. Unlike Releases, this does not need a Context:
 * Releases' search box lives in the global header, far from the list that reads it, so a Context is
 * what bridges them. Here the controls and the list are the same section of the same page, so plain
 * local state is the whole of what reusing "the same technique" requires.
 */
export function TestCasesSection({
  testCases,
  newTestCaseHref,
  projectId,
  releaseId,
  buildId,
}: {
  testCases: TestCaseSummary[];
  newTestCaseHref: string;
  projectId: string;
  releaseId: string;
  buildId: string;
}) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<TestCasePriority | typeof ANY>(ANY);
  const [status, setStatus] = useState<TestCaseStatus | typeof ANY>(ANY);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return testCases.filter((testCase) => {
      if (priority !== ANY && testCase.priority !== priority) return false;
      if (status !== ANY && testCase.status !== status) return false;
      if (normalizedQuery && !testCase.title.toLocaleLowerCase().includes(normalizedQuery)) return false;
      return true;
    });
  }, [testCases, query, priority, status]);

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div className="flex items-center gap-xs">
          <h2 id="test-cases-heading" className="font-heading text-title-lg">
            Test Cases
          </h2>
          {testCases.length > 0 && (
            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-body-sm tabular-nums text-muted-foreground">
              {testCases.length}
            </span>
          )}
        </div>
        {testCases.length > 0 && (
          <Button asChild variant="secondary">
            <Link href={newTestCaseHref}>
              <ClipboardList aria-hidden="true" />
              New Test Case
            </Link>
          </Button>
        )}
      </div>

      {/* Search and filters mirror the Input's own stroke and radius, per DESIGN.md §4, so the strip
          reads as one continuous control rather than three unrelated widgets. */}
      {testCases.length > 0 && (
        <div className="flex flex-wrap items-center gap-xs">
          <label className="relative min-w-48 flex-1">
            <span className="sr-only">Search test cases by title</span>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title…"
              className="pl-8"
            />
          </label>

          <label className="sr-only" htmlFor="test-case-priority-filter">
            Filter by priority
          </label>
          <select
            id="test-case-priority-filter"
            value={priority}
            onChange={(event) => setPriority(event.target.value as TestCasePriority | typeof ANY)}
            className={FILTER_SELECT_CLASSES}
          >
            <option value={ANY}>All priorities</option>
            {TEST_CASE_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="test-case-status-filter">
            Filter by status
          </label>
          <select
            id="test-case-status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value as TestCaseStatus | typeof ANY)}
            className={FILTER_SELECT_CLASSES}
          >
            <option value={ANY}>All statuses</option>
            {TEST_CASE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      )}

      {testCases.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No test cases yet</CardTitle>
            <CardDescription>
              Test cases arrive by creating one — add the first thing to verify on this build.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href={newTestCaseHref}>
                <ClipboardList aria-hidden="true" />
                New Test Case
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        // Distinct from "no test cases yet" above: cases exist, none match the current search/filters.
        <div className="rounded-xl border border-dashed border-border bg-card p-lg text-body-sm text-muted-foreground">
          No test cases match this search.
        </div>
      ) : (
        <ul aria-labelledby="test-cases-heading" className="flex flex-col gap-xs">
          {filtered.map((testCase) => (
            <li key={testCase.id}>
              <TestCaseRow
                projectId={projectId}
                releaseId={releaseId}
                buildId={buildId}
                testCase={testCase}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TestCaseRow({
  projectId,
  releaseId,
  buildId,
  testCase,
}: {
  projectId: string;
  releaseId: string;
  buildId: string;
  testCase: TestCaseSummary;
}) {
  return (
    // One link, stretched over the whole row by its own `after` layer — the same treatment
    // `ReleaseDetailsPage`'s own `BuildRow` uses, and for the same reason.
    <div className="group relative flex flex-col gap-md rounded-xl border border-border bg-card p-md transition-colors hover:border-ring/60 hover:bg-accent/40 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-sm">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <ClipboardList className="size-5" aria-hidden="true" />
        </span>

        <div className="flex min-w-0 flex-col gap-2xs">
          <span className="font-mono text-body-sm text-reference">{testCase.code}</span>
          <h3 className="text-title-md font-semibold">
            <Link
              href={`/projects/${projectId}/releases/${releaseId}/builds/${buildId}/test-cases/${testCase.id}`}
              className="after:absolute after:inset-0 focus-visible:outline-none"
            >
              {testCase.title}
            </Link>
          </h3>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-xs">
        <Chip>{testCase.priority}</Chip>
        <Chip>{testCase.status}</Chip>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-reference"
        />
      </div>
    </div>
  );
}
