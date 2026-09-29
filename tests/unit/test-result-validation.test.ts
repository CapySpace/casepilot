import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MAXIMUM_NOTES_LENGTH } from "@/lib/test-attempts/limits";
import { testResultMessages } from "@/lib/test-attempts/messages";
import {
  DEFAULT_TEST_ATTEMPT_STATUS,
  DEFAULT_TEST_RESULT_OUTCOME,
  TEST_ATTEMPT_STATUSES,
  TEST_RESULT_OUTCOMES,
  validateNotes,
} from "@/lib/test-attempts/validation";

describe("validating a Result's notes", () => {
  it("accepts no notes at all", () => {
    expect(validateNotes("")).toBeUndefined();
  });

  it("accepts ordinary notes", () => {
    expect(validateNotes("The confirmation banner never appeared.")).toBeUndefined();
  });

  it("refuses notes that are only whitespace", () => {
    expect(validateNotes("   \t\n ")).toBe(testResultMessages.notesBlank);
  });

  it("refuses notes past the limit, measuring them trimmed", () => {
    expect(validateNotes("a".repeat(MAXIMUM_NOTES_LENGTH + 1))).toBe(testResultMessages.notesTooLong);

    expect(validateNotes(`${"a".repeat(MAXIMUM_NOTES_LENGTH)}   `)).toBeUndefined();
  });
});

describe("a Result's Outcome", () => {
  it("is one of Not Run, Passed, Failed, Blocked or Skipped", () => {
    expect(TEST_RESULT_OUTCOMES).toEqual(["Not Run", "Passed", "Failed", "Blocked", "Skipped"]);
  });

  it("defaults to Not Run, matching the column default", () => {
    expect(DEFAULT_TEST_RESULT_OUTCOME).toBe("Not Run");
  });
});

describe("an Attempt's Status", () => {
  it("is one of In Progress or Completed", () => {
    expect(TEST_ATTEMPT_STATUSES).toEqual(["In Progress", "Completed"]);
  });

  it("defaults to In Progress, matching the column default", () => {
    expect(DEFAULT_TEST_ATTEMPT_STATUS).toBe("In Progress");
  });
});

describe("the stated limits", () => {
  it("are the limits the database enforces", () => {
    const migrations = join("supabase", "migrations");
    const sql = readdirSync(migrations)
      .map((file) => readFileSync(join(migrations, file), "utf8"))
      .join("\n");

    expect(sql).toContain(`check (char_length(trim(notes)) between 1 and ${MAXIMUM_NOTES_LENGTH})`);
    expect(sql).toContain(`check (outcome in ('${TEST_RESULT_OUTCOMES.join("', '")}'))`);
    expect(sql).toContain(`check (status in ('${TEST_ATTEMPT_STATUSES.join("', '")}'))`);
  });

  it("are the defaults the database assigns", () => {
    const migrations = join("supabase", "migrations");
    const sql = readdirSync(migrations)
      .map((file) => readFileSync(join(migrations, file), "utf8"))
      .join("\n");

    expect(sql).toContain(`default '${DEFAULT_TEST_RESULT_OUTCOME}'`);
    expect(sql).toContain(`default '${DEFAULT_TEST_ATTEMPT_STATUS}'`);
  });

  it("are stated in the copy the form shows", () => {
    expect(testResultMessages.notesTooLong).toContain(String(MAXIMUM_NOTES_LENGTH));
  });
});
