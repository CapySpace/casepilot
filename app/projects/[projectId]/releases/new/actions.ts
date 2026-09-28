"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProjectMembership } from "@/lib/projects/dal";
import { releaseMessages } from "@/lib/releases/messages";
import {
  validateReleaseDetails,
  type ReleaseDetails,
  type ReleaseErrors,
} from "@/lib/releases/validation";
import { createClient } from "@/lib/supabase/server";

export type NewReleaseState = {
  errors: ReleaseErrors;
  /** A failure that belongs to no single field — the version-collision message lands here. */
  message: string | null;
  /** Echoed back so a rejected attempt does not also cost the Member what they typed. */
  values: ReleaseDetails;
};

/** Postgres's unique-violation code: `releases_one_version_per_project`. */
const UNIQUE_VIOLATION = "23505";

export async function createRelease(
  _previous: NewReleaseState,
  formData: FormData,
): Promise<NewReleaseState> {
  const projectId = String(formData.get("projectId") ?? "");
  // A Server Action is reachable by a direct POST, not only through the form, so membership of
  // whatever Project id arrives is checked here rather than assumed from the page that rendered it.
  await requireProjectMembership(projectId);

  const version = String(formData.get("version") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const values = { version, name, description };

  // The same validation the browser ran, for the same reason Project creation runs it twice.
  const errors = validateReleaseDetails(values);
  if (Object.keys(errors).length > 0) {
    return { errors, message: null, values };
  }

  const supabase = await createClient();

  // Unlike a Project, the row can be read back from its own INSERT: the caller is already a Member
  // of this Project — `requireProjectMembership` above proved it — so the SELECT policy on `releases`
  // is satisfied at the moment the RETURNING row is evaluated. There is no Owner-Membership trigger
  // racing it the way there is for `projects`.
  const { data, error } = await supabase
    .from("releases")
    .insert({
      project_id: projectId,
      version,
      // An absent name or description is null, not an empty string, for the reason
      // `app/projects/new/actions.ts` gives: "nobody wrote one" and "somebody wrote nothing" are the
      // same fact, and storing two spellings of it means every reader handles both.
      name: name === "" ? null : name,
      description: description === "" ? null : description,
    })
    .select("id")
    .single();

  if (error) {
    // The database is the authority on uniqueness, not a check this action made a moment earlier: two
    // Members' clicks could both pass such a check and only one can win.
    if (error.code === UNIQUE_VIOLATION) {
      return { errors: {}, message: releaseMessages.versionAlreadyUsed(version), values };
    }

    console.error(`Could not create a Release in Project ${projectId}`, error);
    return { errors: {}, message: releaseMessages.couldNotCreate, values };
  }

  // The list is about to gain a row, and the Router Cache is still holding the version without it.
  revalidatePath(`/projects/${projectId}/releases`);
  redirect(`/projects/${projectId}/releases/${data.id}`);
}
