"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import { FormAlert } from "@/components/form/fields";
import { Textarea } from "@/components/ui/textarea";
import { formatDay } from "@/lib/dates";
import type { TestResultDetail } from "@/lib/test-attempts/dal";
import { MAXIMUM_NOTES_LENGTH } from "@/lib/test-attempts/limits";
import { TEST_RESULT_OUTCOMES, type TestResultOutcome } from "@/lib/test-attempts/validation";

import { OUTCOME_TOKENS, OutcomeDot } from "../../../../_components/status-chips";
import { recordResult } from "../actions";

/** The four a Member can actually record — `Not Run` is the starting point, never a click target. */
const OUTCOME_ACTIONS = TEST_RESULT_OUTCOMES.filter(
  (outcome): outcome is Exclude<TestResultOutcome, "Not Run"> => outcome !== "Not Run",
);

const NOTES_DEBOUNCE_MS = 500;

/**
 * The currently focused Case: its full snapshot, and the controls that record against it.
 *
 * Keyed by `result.id` from `ExecutionScreen`, so switching Cases remounts this component rather than
 * updating it in place — the simplest way to guarantee a stale debounce timer or half-typed note from
 * the last Case can never leak onto the next one. Everything editable (`outcome`, `notes`) is this
 * component's own state from that point on, seeded once from `result` at mount; the parent's copy is
 * updated only through `onSaved`, after a write actually lands, so there is exactly one source of
 * truth for "what was last successfully saved" and it is never guessed at.
 */
export function ResultPanel({
  projectId,
  releaseId,
  buildId,
  result,
  executedByName,
  onSaved,
}: {
  projectId: string;
  releaseId: string;
  buildId: string;
  result: TestResultDetail;
  /**
   * Resolved from the Attempt's own fresh `result.executedBy` by the caller (`nameFor`, over the
   * Project's current membership list) — read directly off this prop rather than copied into local
   * state, so a save recorded by *this* browser and one recorded elsewhere and later fetched in are
   * shown the same way, with the real name in both cases, not a placeholder for one of them.
   */
  executedByName: string | null;
  onSaved: (patch: Pick<TestResultDetail, "outcome" | "notes" | "executedBy" | "executedAt">) => void;
}) {
  const [outcome, setOutcome] = useState<TestResultOutcome>(result.outcome);
  const [notes, setNotes] = useState(result.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function save(nextOutcome: TestResultOutcome, nextNotes: string) {
    startTransition(async () => {
      const response = await recordResult({
        projectId,
        releaseId,
        buildId,
        resultId: result.id,
        outcome: nextOutcome,
        notes: nextNotes,
      });

      if (!response.ok) {
        setError(response.error);
        return;
      }

      setError(null);
      onSaved({
        outcome: response.outcome,
        notes: response.notes,
        executedBy: response.executedBy,
        executedAt: response.executedAt,
      });
    });
  }

  function handleOutcomeClick(next: TestResultOutcome) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setOutcome(next);
    save(next, notes);
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(outcome, value), NOTES_DEBOUNCE_MS);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-md rounded-xl border border-border bg-card p-lg">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="flex flex-col gap-2xs">
          <span className="font-mono text-body-sm text-reference">{result.testCaseCode}</span>
          <h2 className="text-title-lg font-semibold">{result.titleSnapshot}</h2>
        </div>
        <p className="text-body-sm text-muted-foreground tabular-nums">
          {result.executedAt && executedByName
            ? `Recorded by ${executedByName} on ${formatDay(result.executedAt)}`
            : "Not yet recorded"}
        </p>
      </div>

      {result.descriptionSnapshot && <Section title="Description">{result.descriptionSnapshot}</Section>}
      {result.preconditionsSnapshot && <Section title="Preconditions">{result.preconditionsSnapshot}</Section>}

      {result.stepsSnapshot.length > 0 && (
        <div className="flex flex-col gap-xs">
          <h3 className="font-heading text-title-md">Steps</h3>
          <ol className="flex flex-col gap-sm">
            {result.stepsSnapshot.map((step, index) => (
              <li key={index} className="rounded-lg border border-border p-sm">
                <p className="text-label-sm uppercase text-muted-foreground">Step {index + 1}</p>
                <p className="whitespace-pre-wrap text-body-md">{step.action}</p>
                {step.expectedResult && (
                  <p className="whitespace-pre-wrap text-body-sm text-muted-foreground">
                    Expected: {step.expectedResult}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {result.expectedResultSnapshot && (
        <Section title="Expected Result">{result.expectedResultSnapshot}</Section>
      )}

      <div className="flex flex-col gap-sm border-t border-border pt-md">
        <FormAlert message={error} />

        <div role="group" aria-label="Outcome" className="flex flex-wrap items-center gap-xs">
          {OUTCOME_ACTIONS.map((candidate) => {
            const token = OUTCOME_TOKENS[candidate];
            const selected = outcome === candidate;

            return (
              <button
                key={candidate}
                type="button"
                aria-pressed={selected}
                disabled={pending}
                onClick={() => handleOutcomeClick(candidate)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-body-sm font-medium transition-colors disabled:opacity-50 ${
                  selected
                    ? `border-transparent ${token.container} ${token.text}`
                    : "border-border text-muted-foreground hover:border-current"
                }`}
              >
                <OutcomeDot outcome={candidate} />
                {candidate}
              </button>
            );
          })}
          {pending && <span className="text-body-sm text-muted-foreground">Saving…</span>}
        </div>

        <label className="flex flex-col gap-2xs">
          <span className="text-label-md">Notes</span>
          <Textarea
            value={notes}
            onChange={(event) => handleNotesChange(event.target.value)}
            maxLength={MAXIMUM_NOTES_LENGTH}
            placeholder="What did you see?"
            className="min-h-24 rounded-lg px-3 py-2 text-body-md"
          />
        </label>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-xs">
      <h3 className="font-heading text-title-md">{title}</h3>
      <p className="whitespace-pre-wrap text-body-md text-muted-foreground">{children}</p>
    </div>
  );
}
