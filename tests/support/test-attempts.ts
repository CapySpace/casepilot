import type { ActingUser } from "./clients";

/**
 * Starts an Attempt the way the application will: the caller must already be a Member of the Project
 * that owns the Build, arranged first by every test using this helper.
 */
export async function createTestAttempt(member: ActingUser, buildId: string): Promise<string> {
  const { data, error } = await member.client
    .from("test_attempts")
    .insert({ build_id: buildId })
    .select("id")
    .single();

  if (error) throw new Error(`Could not start an Attempt as ${member.email}: ${error.message}`);

  return data.id as string;
}

/**
 * Creates a Result directly, the way the application's bulk insert at Attempt-start will — this
 * ticket has no Server Action yet, so the RLS suite writes the row itself the same way that insert
 * eventually will.
 */
export async function createTestResult(
  member: ActingUser,
  testingAttemptId: string,
  testCaseId: string,
  titleSnapshot = "Sign in with valid credentials",
): Promise<string> {
  const { data, error } = await member.client
    .from("test_results")
    .insert({
      testing_attempt_id: testingAttemptId,
      test_case_id: testCaseId,
      test_case_title_snapshot: titleSnapshot,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Could not create a Result as ${member.email}: ${error.message}`);

  return data.id as string;
}

/**
 * Completes an Attempt directly — there is no "Complete Attempt" UI yet (ticket 04's own work), so
 * this is how a test arranges "already Completed" as a precondition, or simulates another Member
 * completing it while the first is still on the execution screen.
 */
export async function completeTestAttempt(member: ActingUser, testingAttemptId: string): Promise<void> {
  const { error } = await member.client
    .from("test_attempts")
    .update({ status: "Completed", completed_at: new Date().toISOString() })
    .eq("id", testingAttemptId);

  if (error) {
    throw new Error(`Could not complete Attempt ${testingAttemptId} as ${member.email}: ${error.message}`);
  }
}
