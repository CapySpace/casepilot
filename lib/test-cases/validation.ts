import {
  MAXIMUM_DESCRIPTION_LENGTH,
  MAXIMUM_EXPECTED_RESULT_LENGTH,
  MAXIMUM_PRECONDITIONS_LENGTH,
  MAXIMUM_STEP_ACTION_LENGTH,
  MAXIMUM_STEP_EXPECTED_RESULT_LENGTH,
  MAXIMUM_STEPS,
  MAXIMUM_TITLE_LENGTH,
} from "./limits";
import { testCaseMessages } from "./messages";

export const TEST_CASE_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export type TestCasePriority = (typeof TEST_CASE_PRIORITIES)[number];

/** What a new Case gets when nobody picks one — must agree with the column default in the migration. */
export const DEFAULT_TEST_CASE_PRIORITY: TestCasePriority = "Medium";

export const TEST_CASE_STATUSES = ["Draft", "Ready", "Deprecated"] as const;
export type TestCaseStatus = (typeof TEST_CASE_STATUSES)[number];

/** What a new Case gets when nobody picks one — must agree with the column default in the migration. */
export const DEFAULT_TEST_CASE_STATUS: TestCaseStatus = "Draft";

export type TestCaseDetails = {
  title: string;
  description: string;
  preconditions: string;
  expectedResult: string;
};

export type TestCaseErrors = Partial<
  Record<"title" | "description" | "preconditions" | "expectedResult", string>
>;

/**
 * Description, preconditions and expected result all follow the same rule: optional, but once started
 * must say something. Unlike `validateBuildDetails`'s optional field, a whitespace-only value is not
 * read as "nobody wrote one" here, because each renders as its own section on Case Details, and a
 * blank section is worse than an absent one.
 */
function validateOptionalProse(
  value: string,
  maximumLength: number,
  messages: { blank: string; tooLong: string },
): string | undefined {
  if (value !== "" && value.trim() === "") return messages.blank;
  if (value.trim().length > maximumLength) return messages.tooLong;
  return undefined;
}

/**
 * Runs in the browser for immediate feedback and again in the Server Action, because browser
 * validation is not a security control — the action is reachable without ever loading the form.
 */
export function validateTestCaseDetails({
  title,
  description,
  preconditions,
  expectedResult,
}: TestCaseDetails): TestCaseErrors {
  const errors: TestCaseErrors = {};

  const trimmedTitle = title.trim();
  if (trimmedTitle === "") {
    errors.title = testCaseMessages.titleRequired;
  } else if (trimmedTitle.length > MAXIMUM_TITLE_LENGTH) {
    errors.title = testCaseMessages.titleTooLong;
  }

  const descriptionError = validateOptionalProse(description, MAXIMUM_DESCRIPTION_LENGTH, {
    blank: testCaseMessages.descriptionBlank,
    tooLong: testCaseMessages.descriptionTooLong,
  });
  if (descriptionError) errors.description = descriptionError;

  const preconditionsError = validateOptionalProse(preconditions, MAXIMUM_PRECONDITIONS_LENGTH, {
    blank: testCaseMessages.preconditionsBlank,
    tooLong: testCaseMessages.preconditionsTooLong,
  });
  if (preconditionsError) errors.preconditions = preconditionsError;

  const expectedResultError = validateOptionalProse(expectedResult, MAXIMUM_EXPECTED_RESULT_LENGTH, {
    blank: testCaseMessages.expectedResultBlank,
    tooLong: testCaseMessages.expectedResultTooLong,
  });
  if (expectedResultError) errors.expectedResult = expectedResultError;

  return errors;
}

export type StepDetails = {
  action: string;
  expectedResult: string;
};

export type StepErrors = Partial<Record<"action" | "expectedResult", string>>;

export type StepsValidationResult = {
  /** A problem with the list as a whole — currently only "too many steps." */
  stepsError: string | null;
  /** One entry per step, in the same order; an entry with no problems is `{}`. */
  stepErrors: StepErrors[];
};

/**
 * Validates a Case's ordered steps. Kept separate from `validateTestCaseDetails` because a step's
 * errors are per-index, not per-field, and a caller (the steps builder) needs to show each step's own
 * problem beside it rather than one combined message.
 *
 * A step's `expectedResult` is genuinely optional and may be blank — unlike the Case-level
 * description/preconditions/expected-result fields, a step with an action and nothing else is a
 * complete, valid step.
 */
export function validateSteps(steps: StepDetails[]): StepsValidationResult {
  if (steps.length > MAXIMUM_STEPS) {
    return { stepsError: testCaseMessages.tooManySteps, stepErrors: [] };
  }

  const stepErrors = steps.map(({ action, expectedResult }): StepErrors => {
    const errors: StepErrors = {};

    const trimmedAction = action.trim();
    if (trimmedAction === "") {
      errors.action = testCaseMessages.stepActionRequired;
    } else if (trimmedAction.length > MAXIMUM_STEP_ACTION_LENGTH) {
      errors.action = testCaseMessages.stepActionTooLong;
    }

    if (expectedResult.trim().length > MAXIMUM_STEP_EXPECTED_RESULT_LENGTH) {
      errors.expectedResult = testCaseMessages.stepExpectedResultTooLong;
    }

    return errors;
  });

  return { stepsError: null, stepErrors };
}

/**
 * Steps arrive at a Server Action as one JSON field rather than indexed form fields: their count and
 * order change as a Member edits, and FormData has no way to say "this group of fields belongs together
 * as item 3." A malformed or absent payload is read as no steps, never as a reason to fail the whole
 * submission — shared by `createTestCase` and `updateTestCase`, so the two cannot silently drift in how
 * forgiving they are of a client that sent something odd.
 */
export function parseStepsFromFormValue(raw: FormDataEntryValue | null): StepDetails[] {
  if (typeof raw !== "string" || raw === "") return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((step: unknown) => {
      const record = step && typeof step === "object" ? (step as Record<string, unknown>) : {};
      return {
        action: typeof record.action === "string" ? record.action : "",
        expectedResult: typeof record.expectedResult === "string" ? record.expectedResult : "",
      };
    });
  } catch {
    return [];
  }
}

export type StoredStep = { action: string; expectedResult?: string };

/**
 * Steps as the database will accept them: trimmed, and with a blank `expectedResult` omitted entirely
 * rather than stored as `""` — the same "nobody wrote one" reading every other optional field in this
 * schema gets. Callers must validate first; this does not repeat `validateSteps`' own checks.
 */
export function stepsForStorage(steps: StepDetails[]): StoredStep[] {
  return steps.map(({ action, expectedResult }) => {
    const trimmedExpectedResult = expectedResult.trim();
    return trimmedExpectedResult === ""
      ? { action: action.trim() }
      : { action: action.trim(), expectedResult: trimmedExpectedResult };
  });
}

function readTestCasePriority(raw: FormDataEntryValue | null): TestCasePriority {
  const value = String(raw ?? "");
  return (TEST_CASE_PRIORITIES as readonly string[]).includes(value)
    ? (value as TestCasePriority)
    : DEFAULT_TEST_CASE_PRIORITY;
}

function readTestCaseStatus(raw: FormDataEntryValue | null): TestCaseStatus {
  const value = String(raw ?? "");
  return (TEST_CASE_STATUSES as readonly string[]).includes(value)
    ? (value as TestCaseStatus)
    : DEFAULT_TEST_CASE_STATUS;
}

export type TestCaseFormValues = TestCaseDetails & {
  priority: TestCasePriority;
  status: TestCaseStatus;
  steps: StepDetails[];
};

/**
 * Everything a Case's form posts, read out of `FormData` in one place — shared by `createTestCase` and
 * `updateTestCase` so the two cannot silently drift in which fields they read or how. A `priority`/
 * `status` outside the allowed set (a stale client, a hand-crafted POST) falls back to the same default
 * a new Case gets, rather than being cast and trusted — `validateTestCaseDetails`/`validateSteps` still
 * run separately, since reading a value and judging it are different jobs.
 */
export function readTestCaseFormValues(formData: FormData): TestCaseFormValues {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    preconditions: String(formData.get("preconditions") ?? "").trim(),
    expectedResult: String(formData.get("expectedResult") ?? "").trim(),
    priority: readTestCasePriority(formData.get("priority")),
    status: readTestCaseStatus(formData.get("status")),
    steps: parseStepsFromFormValue(formData.get("steps")),
  };
}

/**
 * The shape a Case's form is built from — shared, unchanged, between creating one and editing one (see
 * the spec's "Edit reuses the Create form" decision). What differs between the two call sites is which
 * Server Action a form dispatches to and which ids travel as hidden fields, not this.
 */
export type TestCaseFormState = {
  errors: TestCaseErrors;
  /** A failure that belongs to no single field. */
  message: string | null;
  values: TestCaseDetails;
  priority: TestCasePriority;
  status: TestCaseStatus;
  /**
   * Echoed back so a rejected attempt does not also cost the Member what they typed. Step-level errors
   * are not threaded through this state at all: `validateSteps` is a pure function of this same array,
   * so the form recomputes them itself from whatever it renders — the server re-validating here is a
   * security check, not a rendering dependency.
   */
  steps: StepDetails[];
};
