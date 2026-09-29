"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { requireProjectMembership } from "@/lib/projects/dal";
import { createClient } from "@/lib/supabase/server";
import { testResultMessages } from "@/lib/test-attempts/messages";
import { validateNotes, type TestResultOutcome } from "@/lib/test-attempts/validation";

export type RecordResultState =
  | {
      ok: true;
      outcome: TestResultOutcome;
      notes: string | null;
      executedBy: string;
      executedAt: string;
    }
  | { ok: false; error: string };

/**
 * Recording a Result: called directly from a Client Component, not bound to a `<form>` — see the
 * spec's "Recording a Result saves imperatively" decision. Always sends the Result's full desired
 * state (both `outcome` and `notes` together), whichever one actually changed, so there is one write
 * shape rather than two partial-update paths that could drift.
 *
 * `requireProjectMembership` is checked against the posted `projectId` for the same reason every
 * other Server Action in this area checks it — reachable by a direct call, not only through the
 * screen that renders the buttons. It is not, on its own, what stops a Member editing a Result outside
 * their own Project, or an Attempt that has since been completed: row-level security and the
 * completion-freeze trigger (`protect_test_result_integrity`, `20260930000000_test_attempts_and_results.sql`)
 * are what actually decide those.
 */
export async function recordResult({
  projectId,
  releaseId,
  buildId,
  resultId,
  outcome,
  notes,
}: {
  projectId: string;
  releaseId: string;
  buildId: string;
  resultId: string;
  outcome: TestResultOutcome;
  notes: string;
}): Promise<RecordResultState> {
  const [user] = await Promise.all([verifySession(), requireProjectMembership(projectId)]);

  const notesError = validateNotes(notes);
  if (notesError) return { ok: false, error: notesError };

  const supabase = await createClient();
  const executedAt = new Date().toISOString();
  const trimmedNotes = notes.trim();

  const { data, error } = await supabase
    .from("test_results")
    .update({
      outcome,
      notes: trimmedNotes === "" ? null : trimmedNotes,
      executed_by: user.id,
      executed_at: executedAt,
    })
    .eq("id", resultId)
    .select("outcome, notes, executed_by, executed_at")
    .maybeSingle();

  if (error) {
    // The freeze trigger's own exception text — matched here so a Member sees why, not just that
    // something failed. Coupled to the migration's wording on purpose; if that message ever changes,
    // this comparison needs to change with it.
    if (error.message.includes("cannot be changed once its Attempt is Completed")) {
      return { ok: false, error: testResultMessages.attemptCompletedWhileEditing };
    }

    console.error(`Could not record Result ${resultId}`, error);
    return { ok: false, error: testResultMessages.couldNotRecord };
  }

  if (!data) {
    console.error(`Result ${resultId} was not found, or is not reachable by this Member`);
    return { ok: false, error: testResultMessages.couldNotRecord };
  }

  // Build Details' Testing Attempts section shows this same Attempt's progress and Outcome
  // breakdown — the same staleness `startTestAttempt` guards against, for the same reason.
  revalidatePath(`/projects/${projectId}/releases/${releaseId}/builds/${buildId}`);

  return {
    ok: true,
    outcome: data.outcome,
    notes: data.notes,
    executedBy: data.executed_by,
    executedAt: data.executed_at,
  };
}
