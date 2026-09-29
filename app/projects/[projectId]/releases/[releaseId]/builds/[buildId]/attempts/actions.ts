"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProjectMembership } from "@/lib/projects/dal";
import { createClient } from "@/lib/supabase/server";
import { testResultMessages } from "@/lib/test-attempts/messages";

export type StartTestAttemptState = {
  message: string | null;
};

/**
 * Starting an Attempt: no fields to fill in, just a Build to start one against. The whole of the work
 * — creating the Attempt and snapshotting every eligible Case into it — happens in one database
 * transaction, `start_test_attempt`, described in `20260930010000_start_test_attempt.sql`.
 *
 * `requireProjectMembership` is checked against the posted `projectId` for the same reason every other
 * Server Action in this area checks it: reachable by a direct POST, not only through the button. It is
 * not, on its own, what stops an Attempt being started against a Build from a different Project — the
 * RPC's own row-level security, reached through `build_project_id`, is what actually decides that.
 */
export async function startTestAttempt(
  _previous: StartTestAttemptState,
  formData: FormData,
): Promise<StartTestAttemptState> {
  const projectId = String(formData.get("projectId") ?? "");
  const releaseId = String(formData.get("releaseId") ?? "");
  const buildId = String(formData.get("buildId") ?? "");
  await requireProjectMembership(projectId);

  const supabase = await createClient();

  const { data: attempt, error } = await supabase
    .rpc("start_test_attempt", { p_build_id: buildId })
    .single<{ id: string }>();

  if (error || !attempt) {
    // The RPC raises the same way for "no eligible Cases" and "not a Member of this Build's Project" —
    // see its own comment — so this message is the honest one for both, and the interface should
    // already have disabled the button in the first place rather than let this be reached.
    console.error(`Could not start an Attempt on Build ${buildId}`, error);
    return { message: testResultMessages.couldNotStart };
  }

  // Build Details' Testing Attempts section is about to gain a row, and the Router Cache is still
  // holding the version without it — the same reasoning `createTestCase` gives, even though this
  // redirect does not land there directly.
  revalidatePath(`/projects/${projectId}/releases/${releaseId}/builds/${buildId}`);
  redirect(
    `/projects/${projectId}/releases/${releaseId}/builds/${buildId}/attempts/${attempt.id}/execute`,
  );
}
