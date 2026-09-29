/**
 * Completion, as a plain progress indicator distinct from the Outcome breakdown bar — "how much is
 * done" rather than "how it went". Deliberately not drawn from the status scale: completion isn't a
 * verdict, so it takes the same brand-not-status pairing `DESIGN.md` §2 already documents for the
 * active-navigation pill (`bg-brand-wash` / `bg-primary`), rather than reaching for Passed's green and
 * quietly implying the testing that has happened is going well.
 */
export function CompletionIndicator({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="flex flex-col gap-xs">
      <p className="text-body-md tabular-nums">Completion: {percent.toFixed(1)}%</p>
      <div
        role="progressbar"
        aria-label="Completion"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-brand-wash"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
