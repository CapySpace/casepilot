"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProjectMembership } from "@/lib/projects/dal";
import { createClient } from "@/lib/supabase/server";
import { testCaseMessages } from "@/lib/test-cases/messages";
import {
  readTestCaseFormValues,
  stepsForStorage,
  validateSteps,
  validateTestCaseDetails,
  type TestCaseFormState,
} from "@/lib/test-cases/validation";

/** Creating shares its shape with editing — see `TestCaseFormState`'s own comment. */
export type NewTestCaseState = TestCaseFormState;

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

  const { title, description, preconditions, expectedResult, priority, status, steps } =
    readTestCaseFormValues(formData);
  const values = { title, description, preconditions, expectedResult };

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
    steps: stepsForStorage(steps),
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
