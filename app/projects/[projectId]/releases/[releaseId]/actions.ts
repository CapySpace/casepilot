"use server";

import { revalidatePath } from "next/cache";

import { requireProjectMembership } from "@/lib/projects/dal";
import { releaseMessages } from "@/lib/releases/messages";
import {
  validateReleaseDetails,
  type ReleaseDetails,
  type ReleaseErrors,
} from "@/lib/releases/validation";
import { createClient } from "@/lib/supabase/server";

export type ReleaseDetailsState = {
  errors: ReleaseErrors;
  /** A failure that belongs to no single field — the version-collision message lands here. */
  message: string | null;
  /** Said once, after a save that worked. */
  notice: string | null;
  values: ReleaseDetails;
};

/** Postgres's unique-violation code: `releases_one_version_per_project`. */
const UNIQUE_VIOLATION = "23505";

/**
 * Changing a Release's version, name and description.
 *
 * Unlike `updateProject`, there is no ownership gate: any Member may edit a Release — see the file
 * comment in `20260928010000_releases_and_builds.sql`. `requireProjectMembership` is still the first
 * thing this does, and for the same reason it is the first thing `createRelease` does: a Server Action
 * is reachable by a direct POST, so Membership of whatever Project id arrives is checked here rather
 * than assumed from the page that rendered the form.
 *
 * Both ids arrive as hidden fields rather than bound into the action, for the reason `updateProject`'s
 * own comment gives at length: a bound Server Action driven by `useActionState` does not progressively
 * enhance. The fields are arguments, not permissions — `.eq("project_id", ...)` below is what stops a
 * Release id for one Project being edited under a different one the caller also belongs to, the same
 * cross-Project mismatch `getRelease` guards on the read side.
 */
export async function updateRelease(
  _previous: ReleaseDetailsState,
  formData: FormData,
): Promise<ReleaseDetailsState> {
  const projectId = String(formData.get("projectId") ?? "");
  const releaseId = String(formData.get("releaseId") ?? "");
  await requireProjectMembership(projectId);

  const version = String(formData.get("version") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const values = { version, name, description };

  // The same validation the browser ran, for the same reason Project and Release creation run it twice.
  const errors = validateReleaseDetails(values);
  if (Object.keys(errors).length > 0) {
    return { errors, message: null, notice: null, values };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("releases")
    .update({
      version,
      // An absent name or description is null, not an empty string, for the reason `createRelease`
      // gives: "nobody wrote one" and "somebody wrote nothing" are the same fact.
      name: name === "" ? null : name,
      description: description === "" ? null : description,
    })
    .eq("id", releaseId)
    .eq("project_id", projectId)
    .select("id");

  if (error) {
    // The database is the authority on uniqueness, not a check this action made a moment earlier: two
    // Members' saves could both pass such a check and only one can win.
    if (error.code === UNIQUE_VIOLATION) {
      return { errors: {}, message: releaseMessages.versionAlreadyUsed(version), notice: null, values };
    }

    console.error(`Could not update Release ${releaseId}`, error);
    return { errors: {}, message: releaseMessages.couldNotUpdate, notice: null, values };
  }

  // `.select()` is what makes a mismatched pair of ids visible. Row-level security already allows the
  // write — the caller is a Member of `projectId` — so an update that touched no row is not a refusal
  // the database made; it is `releaseId` naming a Release under some other Project, and the `.eq`
  // above is what catches that rather than silently doing nothing.
  if ((data ?? []).length === 0) {
    console.error(`Release ${releaseId} is not under Project ${projectId}`);
    return { errors: {}, message: releaseMessages.couldNotUpdate, notice: null, values };
  }

  // The list shows a Release's version and name, and this page is about to show new ones.
  revalidatePath(`/projects/${projectId}/releases`);
  revalidatePath(`/projects/${projectId}/releases/${releaseId}`);

  return { errors: {}, message: null, notice: releaseMessages.releaseUpdated, values };
}
