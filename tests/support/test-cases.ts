import type { ActingUser } from "./clients";

/**
 * Creates a Case the way the application will: the caller must already be a Member of the Project that
 * owns the Build, arranged first by every test using this helper.
 */
export async function createTestCase(
  member: ActingUser,
  buildId: string,
  title = "Sign in with valid credentials",
): Promise<string> {
  const { data, error } = await member.client
    .from("test_cases")
    .insert({ build_id: buildId, title })
    .select("id")
    .single();

  if (error) throw new Error(`Could not create a Case as ${member.email}: ${error.message}`);

  return data.id as string;
}
