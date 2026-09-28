import type { ActingUser } from "./clients";

/**
 * Creates a Release the way the application will: the caller must already be a Member of the
 * Project, which is a precondition every test using this helper arranges first.
 *
 * Unlike `createProject`, the row can be read back from its own INSERT — there is no trigger racing
 * the SELECT policy here, because the caller's Membership already exists before the Release does.
 */
export async function createRelease(
  member: ActingUser,
  projectId: string,
  version = "1.0.0",
  overrides: { name?: string; description?: string } = {},
): Promise<string> {
  const { data, error } = await member.client
    .from("releases")
    .insert({ project_id: projectId, version, ...overrides })
    .select("id")
    .single();

  if (error) throw new Error(`Could not create a Release as ${member.email}: ${error.message}`);

  return data.id as string;
}
