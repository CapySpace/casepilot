import { describe, expect, it } from "vitest";

import { formatDay } from "@/lib/dates";

/**
 * One date format, stated once.
 *
 * Two pages already show a date — when a Project was created, when somebody joined — and a product
 * that writes the same kind of fact two ways looks unfinished. The format is also deliberately
 * unambiguous: "27/09/2026" and "09/27/2026" are the same string to a machine and opposite facts to a
 * reader, so the month is spelled.
 */
describe("formatting a day", () => {
  it("spells the month, so a date cannot be read backwards", () => {
    expect(formatDay("2026-09-27T14:32:05.000Z")).toBe("27 September 2026");
    expect(formatDay("2026-01-05T00:00:00.000Z")).toBe("5 January 2026");
  });

  it("takes a Date as readily as a string", () => {
    expect(formatDay(new Date("2026-12-31T23:59:59.000Z"))).toBe("31 December 2026");
  });

  it("says so plainly when there is no date to show", () => {
    // Rather than "Invalid Date", which is a JavaScript detail nobody outside this file should meet.
    expect(formatDay("not a date")).toBe("Unknown");
  });
});
