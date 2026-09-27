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

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

describe("the Project interface", () => {
  it("spends no status colour on anything that is not a status", () => {
    const offenders = filesUnder(join("app", "projects")).filter((path) =>
      STATUS_UTILITIES.test(readFileSync(path, "utf8")),
    );

    expect(offenders).toEqual([]);
  });
});
