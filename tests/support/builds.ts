import type { ActingUser } from "./clients";

/**
 * Creates a Build the way the application will: the caller must already be a Member of the Project
 * that owns the Release, arranged first by every test using this helper.
 */
export async function createBuild(
  member: ActingUser,
  releaseId: string,
  buildNumber = "100",
  description?: string,
): Promise<string> {
  const { data, error } = await member.client
    .from("builds")
    .insert({ release_id: releaseId, build_number: buildNumber, description })
    .select("id")
    .single();

  if (error) throw new Error(`Could not create a Build as ${member.email}: ${error.message}`);

  return data.id as string;
}
