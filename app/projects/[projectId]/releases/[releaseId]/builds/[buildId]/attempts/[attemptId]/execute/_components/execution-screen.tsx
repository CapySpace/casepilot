"use client";

import { useMemo, useState } from "react";

import type { ProjectPerson } from "@/lib/projects/dal";
import { nameForPerson } from "@/lib/projects/people";
import { outcomeBreakdown } from "@/lib/test-attempts/breakdown";
import type { TestResultDetail } from "@/lib/test-attempts/dal";

import { OutcomeChip } from "../../../../_components/status-chips";
import { ProgressBar } from "../../../../_components/progress-bar";
import { ResultPanel } from "./result-panel";

/**
 * The interactive part of the Testing Execution Page: the live progress bar, the jump-to-Case rail,
 * and the currently focused Case's recording controls.
 *
 * `results` is the one piece of state this component owns; `ResultPanel` reports a confirmed save back
 * through `onSaved` rather than owning the array itself, so the rail's chip and the Progress Bar above
 * it are always reading the same numbers the last successful write actually returned — never an
 * optimistic guess that a failed save would leave stale.
 */
export function ExecutionScreen({
  projectId,
  releaseId,
  buildId,
  initialResults,
  people,
  personNoLongerInProject,
}: {
  projectId: string;
  releaseId: string;
  buildId: string;
  initialResults: TestResultDetail[];
  /**
   * Plain, serializable data — never the `nameFor` closure Server Components elsewhere in this tree
   * build for themselves, since a function cannot cross into a Client Component as a prop. The lookup
   * itself (`nameForPerson`) is a pure function, safe to run here instead of on the server.
   */
  people: ProjectPerson[];
  personNoLongerInProject: string;
}) {
  const [results, setResults] = useState(initialResults);
  const [activeId, setActiveId] = useState<string | null>(initialResults[0]?.id ?? null);

  const breakdown = useMemo(() => outcomeBreakdown(results), [results]);
  const tested = results.length - breakdown["Not Run"];
  const active = results.find((result) => result.id === activeId) ?? null;

  function applySaved(id: string, patch: Pick<TestResultDetail, "outcome" | "notes" | "executedBy" | "executedAt">) {
    setResults((previous) => previous.map((result) => (result.id === id ? { ...result, ...patch } : result)));
  }

  if (results.length === 0) {
    return (
      <p className="text-body-md text-muted-foreground">This Attempt has no Cases recorded against it.</p>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <ProgressBar tested={tested} total={results.length} breakdown={breakdown} />

      <div className="flex flex-col gap-lg md:flex-row">
        <ResultRail results={results} activeId={active?.id ?? null} onSelect={setActiveId} />

        {active && (
          <ResultPanel
            key={active.id}
            projectId={projectId}
            releaseId={releaseId}
            buildId={buildId}
            result={active}
            executedByName={
              active.executedBy ? nameForPerson(people, active.executedBy, personNoLongerInProject) : null
            }
            onSaved={(patch) => applySaved(active.id, patch)}
          />
        )}
      </div>
    </div>
  );
}

function ResultRail({
  results,
  activeId,
  onSelect,
}: {
  results: TestResultDetail[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="Jump to a Case" className="shrink-0 md:w-72">
      <ol className="flex flex-col gap-2xs">
        {results.map((result) => (
          <li key={result.id}>
            <button
              type="button"
              onClick={() => onSelect(result.id)}
              aria-current={result.id === activeId ? "true" : undefined}
              className={`flex w-full items-center justify-between gap-sm rounded-lg border px-sm py-xs text-left transition-colors ${
                result.id === activeId
                  ? "border-ring bg-accent/40"
                  : "border-transparent hover:border-border hover:bg-accent/20"
              }`}
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-mono text-body-sm text-reference">{result.testCaseCode}</span>
                <span className="truncate text-body-sm">{result.titleSnapshot}</span>
              </span>
              <OutcomeChip outcome={result.outcome} />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
