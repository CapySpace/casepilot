import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDay } from "@/lib/dates";
import type { TestAttemptSummary } from "@/lib/test-attempts/dal";
import { attemptMedallionTone, type AttemptMedallionTone } from "@/lib/test-attempts/medallion";
import { testResultMessages } from "@/lib/test-attempts/messages";
import type { TestResultOutcome } from "@/lib/test-attempts/validation";

import { DeleteAttempt } from "../attempts/_components/delete-attempt";
import { AttemptStatusChip } from "./status-chips";
import { StartAttemptForm } from "./start-attempt-form";

const MEDALLION_CLASSES: Record<AttemptMedallionTone, string> = {
  failed: "bg-failed text-white",
  attention: "bg-blocked text-white",
  passed: "bg-passed text-white",
  dormant: "bg-not-run text-white",
};

/**
 * `DESIGN.md` §4's Timeline calls for "a status-coloured bold title" — `Attempt #3 · Passed` in its
 * own worked example. An Attempt has no single verdict word to append (see `medallion.ts`'s own
 * comment), so the adaptation carries the same tone into the title's colour instead of inventing one:
 * scannable by colour, the way the literal example is, without claiming a verdict that isn't there.
 * `dormant` stays the default heading colour — `DESIGN.md` §2 reads greyed-out as "colour withheld",
 * not "coloured grey".
 */
const TITLE_TONE_CLASSES: Record<AttemptMedallionTone, string> = {
  failed: "text-failed-on-container",
  attention: "text-blocked-on-container",
  passed: "text-passed-on-container",
  dormant: "text-foreground",
};

/**
 * Build Details' Testing Attempts section: `DESIGN.md` §4's Timeline, one entry per Attempt taken
 * against this Build, newest first, with the action that starts the next one.
 *
 * `nameFor` is threaded in rather than looked up here, the same shape `TestCaseDetailsPage` uses for
 * its own `nameFor` — the caller already holds `listProjectPeople`'s result, and a second fetch here
 * would duplicate it needlessly. `AttemptEntry`'s own `deleteControl` prop follows the same reasoning
 * one step further: this component builds the whole `DeleteAttempt` element, not just the ids it
 * needs, so the ids travel no further than the component that actually uses them.
 */
export function TestingAttemptsSection({
  attempts,
  hasEligibleCases,
  nameFor,
  projectId,
  releaseId,
  buildId,
}: {
  attempts: TestAttemptSummary[];
  hasEligibleCases: boolean;
  nameFor: (userId: string) => string;
  projectId: string;
  releaseId: string;
  buildId: string;
}) {
  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div className="flex items-center gap-xs">
          <h2 id="testing-attempts-heading" className="font-heading text-title-lg">
            Testing Attempts
          </h2>
          {attempts.length > 0 && (
            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-body-sm tabular-nums text-muted-foreground">
              {attempts.length}
            </span>
          )}
        </div>
        <StartAttemptForm
          projectId={projectId}
          releaseId={releaseId}
          buildId={buildId}
          hasEligibleCases={hasEligibleCases}
        />
      </div>

      {attempts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{testResultMessages.noAttemptsYetTitle}</CardTitle>
            <CardDescription>{testResultMessages.noAttemptsYetDescription}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ol aria-labelledby="testing-attempts-heading" className="relative flex flex-col gap-md">
          {/* The Timeline's vertical hairline connector, per DESIGN.md §4: one line behind every
              medallion, rather than a segment per row — simpler than stitching gaps together, and the
              same visual result. */}
          {attempts.length > 1 && (
            <span aria-hidden="true" className="absolute top-4 bottom-4 left-4 w-px bg-border" />
          )}
          {attempts.map((attempt) => {
            const tone = attemptMedallionTone(attempt);
            return (
              <li key={attempt.id} className="relative flex gap-sm">
                <AttemptMedallion tone={tone} />
                <AttemptEntry
                  attempt={attempt}
                  tone={tone}
                  nameFor={nameFor}
                  href={`/projects/${projectId}/releases/${releaseId}/builds/${buildId}/attempts/${attempt.id}${attempt.status === "In Progress" ? "/execute" : ""}`}
                  deleteControl={
                    attempt.status === "In Progress" ? (
                      <DeleteAttempt
                        projectId={projectId}
                        releaseId={releaseId}
                        buildId={buildId}
                        attemptId={attempt.id}
                        attemptNumber={attempt.attemptNumber}
                      />
                    ) : null
                  }
                />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function AttemptMedallion({ tone }: { tone: AttemptMedallionTone }) {
  return (
    <span
      aria-hidden="true"
      className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-body-sm font-semibold ${MEDALLION_CLASSES[tone]}`}
    >
      {tone === "passed" ? "✓" : tone === "failed" ? "✕" : ""}
    </span>
  );
}

function AttemptEntry({
  attempt,
  tone,
  nameFor,
  href,
  deleteControl,
}: {
  attempt: TestAttemptSummary;
  tone: AttemptMedallionTone;
  nameFor: (userId: string) => string;
  href: string;
  /** Built by the caller, which already holds the ids this needs — see its own comment. */
  deleteControl: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-xs rounded-xl border border-border bg-card p-md">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h3 className={`text-title-md font-semibold ${TITLE_TONE_CLASSES[tone]}`}>
          <Link href={href} className="hover:underline">
            {testResultMessages.attemptLabel(attempt.attemptNumber)}
          </Link>
        </h3>
        <div className="flex items-center gap-xs">
          <AttemptStatusChip status={attempt.status} />
          <span className="text-body-sm tabular-nums text-muted-foreground">{formatDay(attempt.startedAt)}</span>
          {deleteControl}
        </div>
      </div>

      <p className="text-body-sm text-muted-foreground">
        Started by {nameFor(attempt.createdBy)}
        {attempt.completedAt && <> · Completed {formatDay(attempt.completedAt)}</>}
      </p>

      <p className="text-body-sm tabular-nums text-muted-foreground">
        Tested: {attempt.tested} / {attempt.total}
      </p>

      <div className="flex flex-wrap items-center gap-xs">
        {(Object.entries(attempt.breakdown) as [TestResultOutcome, number][])
          .filter(([, count]) => count > 0)
          .map(([outcome, count]) => (
            <span key={outcome} className="text-body-sm tabular-nums text-muted-foreground">
              {outcome}: {count}
            </span>
          ))}
      </div>
    </div>
  );
}
