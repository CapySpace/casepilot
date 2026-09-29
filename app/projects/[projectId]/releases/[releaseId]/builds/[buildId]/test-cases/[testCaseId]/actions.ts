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

/** Editing shares its shape with creating — see `TestCaseFormState`'s own comment. */
export type EditTestCaseState = TestCaseFormState;

/**
 * Changing a Case: any field, by any Member, at any time — see the file comment in
 * `20260929000000_test_cases.sql` for why there is no creator-only gate.
 *
 * `requireProjectMembership` and the `.eq("build_id", ...)` match below follow `updateRelease`'s own
 * shape exactly, for the same two reasons: a Server Action is reachable by a direct POST, and
 * row-level security alone would let a Member edit a Case under the *right* Project but a URL naming
 * the *wrong* Build — the `.select()` length check is what catches a mismatch that would otherwise
 * silently do nothing. `.is("deleted_at", null)` additionally stops a direct POST from reviving a
 * deleted Case's fields: reads already exclude it (`getTestCase`), and a delete is terminal this phase.
 */
export async function updateTestCase(
  _previous: EditTestCaseState,
  formData: FormData,
): Promise<EditTestCaseState> {
  const projectId = String(formData.get("projectId") ?? "");
  const releaseId = String(formData.get("releaseId") ?? "");
  const buildId = String(formData.get("buildId") ?? "");
  const testCaseId = String(formData.get("testCaseId") ?? "");
  await requireProjectMembership(projectId);

  const { title, description, preconditions, expectedResult, priority, status, steps } =
    readTestCaseFormValues(formData);
  const values = { title, description, preconditions, expectedResult };

  const errors = validateTestCaseDetails(values);
  const { stepsError, stepErrors } = validateSteps(steps);
  const hasStepErrors = stepErrors.some((stepError) => Object.keys(stepError).length > 0);

  if (Object.keys(errors).length > 0 || stepsError !== null || hasStepErrors) {
    return { errors, message: null, values, priority, status, steps };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("test_cases")
    .update({
      title,
      description: description === "" ? null : description,
      preconditions: preconditions === "" ? null : preconditions,
      expected_result: expectedResult === "" ? null : expectedResult,
      steps: stepsForStorage(steps),
      priority,
      status,
    })
    .eq("id", testCaseId)
    .eq("build_id", buildId)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    console.error(`Could not update Case ${testCaseId}`, error);
    return { errors: {}, message: testCaseMessages.couldNotUpdate, values, priority, status, steps };
  }

  if ((data ?? []).length === 0) {
    console.error(`Case ${testCaseId} is not under Build ${buildId}, or has been deleted`);
    return { errors: {}, message: testCaseMessages.couldNotUpdate, values, priority, status, steps };
  }

  // Details shows the values that just changed, and the Build's own list shows the title/priority/status
  // that may have changed with them.
  revalidatePath(`/projects/${projectId}/releases/${releaseId}/builds/${buildId}`);
  revalidatePath(
    `/projects/${projectId}/releases/${releaseId}/builds/${buildId}/test-cases/${testCaseId}`,
  );
  redirect(`/projects/${projectId}/releases/${releaseId}/builds/${buildId}/test-cases/${testCaseId}`);
}

export type DeleteTestCaseState = {
  message: string | null;
};

/**
 * Soft-deleting a Case: an `UPDATE` setting `deleted_at`, never a Postgres `DELETE` — see the schema's
 * own comment on why there is no `DELETE` policy to call in the first place. Any Member may do this, the
 * same as editing. `.is("deleted_at", null)` stops a second delete from moving `deleted_at` forward —
 * the freeze trigger would refuse that anyway, but failing here reads as "already gone" rather than as
 * an unexplained database error.
 */
export async function deleteTestCase(
  _previous: DeleteTestCaseState,
  formData: FormData,
): Promise<DeleteTestCaseState> {
  const projectId = String(formData.get("projectId") ?? "");
  const releaseId = String(formData.get("releaseId") ?? "");
  const buildId = String(formData.get("buildId") ?? "");
  const testCaseId = String(formData.get("testCaseId") ?? "");
  await requireProjectMembership(projectId);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("test_cases")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", testCaseId)
    .eq("build_id", buildId)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    console.error(`Could not delete Case ${testCaseId}`, error);
    return { message: testCaseMessages.couldNotDelete };
  }

  // Zero rows means either a Build mismatch or a Case already gone — either way, "delete" has nothing
  // left to do, and saying so beats redirecting as though it had just happened.
  if ((data ?? []).length === 0) {
    console.error(`Case ${testCaseId} is not under Build ${buildId}, or was already deleted`);
    return { message: testCaseMessages.couldNotDelete };
  }

  revalidatePath(`/projects/${projectId}/releases/${releaseId}/builds/${buildId}`);
  redirect(`/projects/${projectId}/releases/${releaseId}/builds/${buildId}`);
}
