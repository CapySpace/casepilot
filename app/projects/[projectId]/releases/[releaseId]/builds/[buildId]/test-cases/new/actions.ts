"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProjectMembership } from "@/lib/projects/dal";
import { createClient } from "@/lib/supabase/server";
import { testCaseMessages } from "@/lib/test-cases/messages";
import {
  DEFAULT_TEST_CASE_PRIORITY,
  DEFAULT_TEST_CASE_STATUS,
  validateSteps,
  validateTestCaseDetails,
  type StepDetails,
  type TestCaseDetails,
  type TestCaseErrors,
  type TestCasePriority,
  type TestCaseStatus,
} from "@/lib/test-cases/validation";

export type NewTestCaseState = {
  errors: TestCaseErrors;
  /** A failure that belongs to no single field. */
  message: string | null;
  values: TestCaseDetails;
  priority: TestCasePriority;
  status: TestCaseStatus;
  /**
   * Echoed back so a rejected attempt does not also cost the Member what they typed. Step-level
   * errors are not threaded through this state at all: `validateSteps` is a pure function of this same
   * array, so the form recomputes them itself from whatever it renders — the server re-validating here
   * is a security check, not a rendering dependency.
   */
  steps: StepDetails[];
};

/**
 * Creating a Case under a Build: a title, an optional description/preconditions/expected result, an
 * ordered list of steps, a priority and a status.
 *
 * `requireProjectMembership` is checked against the posted `projectId` for the same reason `createBuild`
 * checks it: a Server Action is reachable by a direct POST, not only through the form. It is not, on its
 * own, what stops a Case being inserted under a Build from a different Project the caller does not
 * belong to — row-level security's own `is_project_member(build_project_id(build_id))` is what actually
 * decides that, checked against the Build's real Project rather than whatever `projectId` arrived
 * alongside it.
 */
export async function createTestCase(
  _previous: NewTestCaseState,
  formData: FormData,
): Promise<NewTestCaseState> {
  const projectId = String(formData.get("projectId") ?? "");
  const releaseId = String(formData.get("releaseId") ?? "");
  const buildId = String(formData.get("buildId") ?? "");
  await requireProjectMembership(projectId);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const preconditions = String(formData.get("preconditions") ?? "").trim();
  const expectedResult = String(formData.get("expectedResult") ?? "").trim();
  const priority = String(formData.get("priority") ?? DEFAULT_TEST_CASE_PRIORITY) as TestCasePriority;
  const status = String(formData.get("status") ?? DEFAULT_TEST_CASE_STATUS) as TestCaseStatus;
  const values = { title, description, preconditions, expectedResult };

  // Steps arrive as one JSON field rather than indexed form fields: their count and order change as a
  // Member edits, and FormData has no way to say "this group of fields belongs together as item 3."
  const steps = parseSteps(formData.get("steps"));

  // The same validation the browser ran, for the same reason every other form in this area runs it
  // twice.
  const errors = validateTestCaseDetails(values);
  const { stepsError, stepErrors } = validateSteps(steps);
  const hasStepErrors = stepErrors.some((stepError) => Object.keys(stepError).length > 0);

  if (Object.keys(errors).length > 0 || stepsError !== null || hasStepErrors) {
    return { errors, message: null, values, priority, status, steps };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("test_cases").insert({
    build_id: buildId,
    title,
    // An absent value is null, not an empty string, for the reason `createRelease` gives: "nobody
    // wrote one" and "somebody wrote nothing" are the same fact.
    description: description === "" ? null : description,
    preconditions: preconditions === "" ? null : preconditions,
    expected_result: expectedResult === "" ? null : expectedResult,
    steps: steps.map(({ action, expectedResult: stepExpectedResult }) => {
      const trimmedExpectedResult = stepExpectedResult.trim();
      return trimmedExpectedResult === ""
        ? { action: action.trim() }
        : { action: action.trim(), expectedResult: trimmedExpectedResult };
    }),
    priority,
    status,
  });

  if (error) {
    console.error(`Could not create a Case under Build ${buildId}`, error);
    return { errors: {}, message: testCaseMessages.couldNotCreate, values, priority, status, steps };
  }

  // The Case list is about to gain a row, and the Router Cache is still holding the version without it.
  revalidatePath(`/projects/${projectId}/releases/${releaseId}/builds/${buildId}`);
  redirect(`/projects/${projectId}/releases/${releaseId}/builds/${buildId}`);
}

/** A malformed or absent payload is read as no steps, never as a reason to fail the whole submission. */
function parseSteps(raw: FormDataEntryValue | null): StepDetails[] {
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
