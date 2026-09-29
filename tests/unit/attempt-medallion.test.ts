import { describe, expect, it } from "vitest";

import { attemptMedallionTone } from "@/lib/test-attempts/medallion";
import { TEST_RESULT_OUTCOMES, type TestResultOutcome } from "@/lib/test-attempts/validation";

function breakdown(counts: Partial<Record<TestResultOutcome, number>>): Record<TestResultOutcome, number> {
  return Object.fromEntries(TEST_RESULT_OUTCOMES.map((outcome) => [outcome, counts[outcome] ?? 0])) as Record<
    TestResultOutcome,
    number
  >;
}

describe("an Attempt's medallion tone", () => {
  it("is dormant while still In Progress, whatever has been recorded so far", () => {
    expect(
      attemptMedallionTone({ status: "In Progress", breakdown: breakdown({ "Not Run": 5 }) }),
    ).toBe("dormant");

    expect(
      attemptMedallionTone({
        status: "In Progress",
        breakdown: breakdown({ Passed: 3, "Not Run": 2 }),
      }),
    ).toBe("dormant");
  });

  it("is dormant once Completed if any Case was left Not Run", () => {
    expect(
      attemptMedallionTone({
        status: "Completed",
        breakdown: breakdown({ Passed: 3, "Not Run": 2 }),
      }),
    ).toBe("dormant");
  });

  it("is passed once Completed with every Case Passed and none left Not Run", () => {
    expect(attemptMedallionTone({ status: "Completed", breakdown: breakdown({ Passed: 5 }) })).toBe(
      "passed",
    );
  });

  it("is attention if any Case is Blocked or Skipped, even ahead of an all-Passed remainder", () => {
    expect(
      attemptMedallionTone({
        status: "Completed",
        breakdown: breakdown({ Passed: 4, Blocked: 1 }),
      }),
    ).toBe("attention");

    expect(
      attemptMedallionTone({
        status: "In Progress",
        breakdown: breakdown({ Skipped: 1, "Not Run": 4 }),
      }),
    ).toBe("attention");
  });

  it("is failed if any Case is Failed, outranking Blocked, Skipped and Not Run alike", () => {
    expect(
      attemptMedallionTone({
        status: "Completed",
        breakdown: breakdown({ Passed: 2, Blocked: 1, Failed: 1 }),
      }),
    ).toBe("failed");

    expect(
      attemptMedallionTone({
        status: "In Progress",
        breakdown: breakdown({ Failed: 1, "Not Run": 4 }),
      }),
    ).toBe("failed");
  });
});
