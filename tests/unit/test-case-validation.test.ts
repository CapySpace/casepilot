import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  MAXIMUM_DESCRIPTION_LENGTH,
  MAXIMUM_EXPECTED_RESULT_LENGTH,
  MAXIMUM_PRECONDITIONS_LENGTH,
  MAXIMUM_STEP_ACTION_LENGTH,
  MAXIMUM_STEP_EXPECTED_RESULT_LENGTH,
  MAXIMUM_STEPS,
  MAXIMUM_TITLE_LENGTH,
} from "@/lib/test-cases/limits";
import { testCaseMessages } from "@/lib/test-cases/messages";
import { validateSteps, validateTestCaseDetails } from "@/lib/test-cases/validation";

describe("validating a Case's details", () => {
  it("accepts a title on its own", () => {
    expect(
      validateTestCaseDetails({
        title: "Sign in with valid credentials",
        description: "",
        preconditions: "",
        expectedResult: "",
      }),
    ).toEqual({});
  });

  it("accepts every field filled in", () => {
    expect(
      validateTestCaseDetails({
        title: "Sign in with valid credentials",
        description: "Checks the happy path of signing in.",
        preconditions: "A verified account exists.",
        expectedResult: "The user lands on the dashboard.",
      }),
    ).toEqual({});
  });

  it("refuses a missing title", () => {
    expect(
      validateTestCaseDetails({ title: "", description: "", preconditions: "", expectedResult: "" }),
    ).toEqual({ title: testCaseMessages.titleRequired });
  });

  it("refuses a title that is only whitespace", () => {
    expect(
      validateTestCaseDetails({
        title: "   \t\n ",
        description: "",
        preconditions: "",
        expectedResult: "",
      }),
    ).toEqual({ title: testCaseMessages.titleRequired });
  });

  it("refuses a title past the limit, measuring it trimmed", () => {
    expect(
      validateTestCaseDetails({
        title: "a".repeat(MAXIMUM_TITLE_LENGTH + 1),
        description: "",
        preconditions: "",
        expectedResult: "",
      }),
    ).toEqual({ title: testCaseMessages.titleTooLong });

    expect(
      validateTestCaseDetails({
        title: `${"a".repeat(MAXIMUM_TITLE_LENGTH)}   `,
        description: "",
        preconditions: "",
        expectedResult: "",
      }),
    ).toEqual({});
  });

  it("refuses a description, preconditions or expected result that is present but blank", () => {
    expect(
      validateTestCaseDetails({
        title: "Sign in",
        description: "   ",
        preconditions: "",
        expectedResult: "",
      }),
    ).toEqual({ description: testCaseMessages.descriptionBlank });

    expect(
      validateTestCaseDetails({
        title: "Sign in",
        description: "",
        preconditions: "  \t ",
        expectedResult: "",
      }),
    ).toEqual({ preconditions: testCaseMessages.preconditionsBlank });

    expect(
      validateTestCaseDetails({
        title: "Sign in",
        description: "",
        preconditions: "",
        expectedResult: " ",
      }),
    ).toEqual({ expectedResult: testCaseMessages.expectedResultBlank });
  });

  it("refuses a description, preconditions or expected result past its limit", () => {
    expect(
      validateTestCaseDetails({
        title: "Sign in",
        description: "a".repeat(MAXIMUM_DESCRIPTION_LENGTH + 1),
        preconditions: "",
        expectedResult: "",
      }),
    ).toEqual({ description: testCaseMessages.descriptionTooLong });

    expect(
      validateTestCaseDetails({
        title: "Sign in",
        description: "",
        preconditions: "a".repeat(MAXIMUM_PRECONDITIONS_LENGTH + 1),
        expectedResult: "",
      }),
    ).toEqual({ preconditions: testCaseMessages.preconditionsTooLong });

    expect(
      validateTestCaseDetails({
        title: "Sign in",
        description: "",
        preconditions: "",
        expectedResult: "a".repeat(MAXIMUM_EXPECTED_RESULT_LENGTH + 1),
      }),
    ).toEqual({ expectedResult: testCaseMessages.expectedResultTooLong });
  });

  it("reports every problem at once", () => {
    expect(
      validateTestCaseDetails({
        title: "",
        description: "a".repeat(MAXIMUM_DESCRIPTION_LENGTH + 1),
        preconditions: "",
        expectedResult: "",
      }),
    ).toEqual({
      title: testCaseMessages.titleRequired,
      description: testCaseMessages.descriptionTooLong,
    });
  });
});

describe("validating a Case's steps", () => {
  it("accepts no steps at all", () => {
    expect(validateSteps([])).toEqual({ stepsError: null, stepErrors: [] });
  });

  it("accepts a step with only an action", () => {
    expect(validateSteps([{ action: "Open the sign-in page", expectedResult: "" }])).toEqual({
      stepsError: null,
      stepErrors: [{}],
    });
  });

  it("accepts a step with an action and an expected result", () => {
    expect(
      validateSteps([{ action: "Enter valid credentials", expectedResult: "The form accepts them" }]),
    ).toEqual({ stepsError: null, stepErrors: [{}] });
  });

  it("refuses a step with a blank action, at its own index", () => {
    expect(
      validateSteps([
        { action: "Open the sign-in page", expectedResult: "" },
        { action: "   ", expectedResult: "" },
      ]),
    ).toEqual({
      stepsError: null,
      stepErrors: [{}, { action: testCaseMessages.stepActionRequired }],
    });
  });

  it("refuses a step's action past its limit", () => {
    expect(
      validateSteps([{ action: "a".repeat(MAXIMUM_STEP_ACTION_LENGTH + 1), expectedResult: "" }]),
    ).toEqual({ stepsError: null, stepErrors: [{ action: testCaseMessages.stepActionTooLong }] });
  });

  it("refuses a step's expected result past its limit", () => {
    expect(
      validateSteps([
        { action: "Submit", expectedResult: "a".repeat(MAXIMUM_STEP_EXPECTED_RESULT_LENGTH + 1) },
      ]),
    ).toEqual({
      stepsError: null,
      stepErrors: [{ expectedResult: testCaseMessages.stepExpectedResultTooLong }],
    });
  });

  it("refuses more than the maximum number of steps", () => {
    const steps = Array.from({ length: MAXIMUM_STEPS + 1 }, (_, index) => ({
      action: `Step ${index}`,
      expectedResult: "",
    }));

    expect(validateSteps(steps)).toEqual({ stepsError: testCaseMessages.tooManySteps, stepErrors: [] });
  });

  it("reports a problem for every invalid step, not just the first", () => {
    expect(
      validateSteps([
        { action: "", expectedResult: "" },
        { action: "Fine", expectedResult: "" },
        { action: "", expectedResult: "" },
      ]),
    ).toEqual({
      stepsError: null,
      stepErrors: [
        { action: testCaseMessages.stepActionRequired },
        {},
        { action: testCaseMessages.stepActionRequired },
      ],
    });
  });
});

describe("the stated limits", () => {
  it("are the limits the database enforces", () => {
    const migrations = join("supabase", "migrations");
    const sql = readdirSync(migrations)
      .map((file) => readFileSync(join(migrations, file), "utf8"))
      .join("\n");

    expect(sql).toContain(`check (char_length(trim(title)) between 1 and ${MAXIMUM_TITLE_LENGTH})`);
    expect(sql).toContain(
      `check (char_length(trim(description)) between 1 and ${MAXIMUM_DESCRIPTION_LENGTH})`,
    );
    expect(sql).toContain(
      `check (char_length(trim(preconditions)) between 1 and ${MAXIMUM_PRECONDITIONS_LENGTH})`,
    );
    expect(sql).toContain(
      `check (char_length(trim(expected_result)) between 1 and ${MAXIMUM_EXPECTED_RESULT_LENGTH})`,
    );
    expect(sql).toContain(`jsonb_array_length(steps) <= ${MAXIMUM_STEPS}`);
    expect(sql).toContain(
      `char_length(trim(step ->> 'action')) between 1 and ${MAXIMUM_STEP_ACTION_LENGTH}`,
    );
    expect(sql).toContain(
      `char_length(step ->> 'expectedResult') <= ${MAXIMUM_STEP_EXPECTED_RESULT_LENGTH}`,
    );
  });

  it("are stated in the copy the form shows", () => {
    expect(testCaseMessages.titleTooLong).toContain(String(MAXIMUM_TITLE_LENGTH));
    expect(testCaseMessages.descriptionTooLong).toContain(String(MAXIMUM_DESCRIPTION_LENGTH));
    expect(testCaseMessages.preconditionsTooLong).toContain(String(MAXIMUM_PRECONDITIONS_LENGTH));
    expect(testCaseMessages.expectedResultTooLong).toContain(String(MAXIMUM_EXPECTED_RESULT_LENGTH));
    expect(testCaseMessages.stepActionTooLong).toContain(String(MAXIMUM_STEP_ACTION_LENGTH));
    expect(testCaseMessages.stepExpectedResultTooLong).toContain(
      String(MAXIMUM_STEP_EXPECTED_RESULT_LENGTH),
    );
    expect(testCaseMessages.tooManySteps).toContain(String(MAXIMUM_STEPS));
  });
});
