import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * `DESIGN.md`'s central discipline: **colour means status, and status alone.**
 *
 * A Role is not a status. The first temptation of the Projects list is a green "Owner" badge, and it
 * would read as a verdict about the Project rather than a fact about the person — green means Passed
 * everywhere else in the product. This test is the enforcement, because the rule is invisible in a
 * diff: nothing goes wrong, the screen just quietly starts lying.
 *
 * Checked by reading the source rather than the rendered page, because the assertion is about which
 * tokens the interface reaches for, and a browser cannot tell a green badge from a green badge with a
 * good reason.
 */
const STATUS_UTILITIES =
  /\b(?:bg|text|border|ring|fill|stroke)-(?:passed|failed|blocked|skipped|not-run)\b/;

/**
 * The only files entitled to these tokens: the ones rendering an actual Outcome verdict
 * (`OutcomeChip`, and the Outcome-recording buttons in `ResultPanel` that share its token map), or
 * deriving from one (a Testing Attempt's medallion, coloured by the Outcomes recorded within it — see
 * `attemptMedallionTone` — and the Progress Bar's segmented track and legend, `DESIGN.md` §4's
 * "product's signature object"). Everything else that might look tempting — a Case's own Status or
 * Priority, an Attempt's own lifecycle Status (`AttemptStatusChip`, defined in the same file as
 * `OutcomeChip` but deliberately *not* using these tokens), a Role — stays on the plain neutral chip
 * precisely so a status colour never means two different things depending on which page it's on.
 * `DESIGN.md`'s status scale sat named but unused in `app/projects` through Phase 3, which is why this
 * test could start as a blanket "nowhere in this tree" rule; Phase 4 is the first to have a real
 * Outcome to colour, and the rule now needs to say *which* files, not *whether any*.
 */
const ALLOWED_OUTCOME_FILES = [
  join(
    "app",
    "projects",
    "[projectId]",
    "releases",
    "[releaseId]",
    "builds",
    "[buildId]",
    "_components",
    "status-chips.tsx",
  ),
  join(
    "app",
    "projects",
    "[projectId]",
    "releases",
    "[releaseId]",
    "builds",
    "[buildId]",
    "_components",
    "testing-attempts-section.tsx",
  ),
  join(
    "app",
    "projects",
    "[projectId]",
    "releases",
    "[releaseId]",
    "builds",
    "[buildId]",
    "_components",
    "progress-bar.tsx",
  ),
];

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

describe("the Project interface", () => {
  it("spends no status colour on anything that is not a status, outside the Outcome chip and the Attempt medallion it derives from", () => {
    const offenders = filesUnder(join("app", "projects")).filter(
      (path) => STATUS_UTILITIES.test(readFileSync(path, "utf8")) && !ALLOWED_OUTCOME_FILES.includes(path),
    );

    expect(offenders).toEqual([]);
  });
});
