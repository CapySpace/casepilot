"use server";

import { revalidatePath } from "next/cache";

import { buildMessages } from "@/lib/builds/messages";
import { validateBuildDetails, type BuildDetails, type BuildErrors } from "@/lib/builds/validation";
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

export type NewBuildState = {
  errors: BuildErrors;
  /** A failure that belongs to no single field — the number-collision message lands here. */
  message: string | null;
  /**
   * Whether the Build was created. Not a notice string: the new row in the list is the confirmation,
   * the same way landing on a freshly created Release is `createRelease`'s. This exists only so the
   * form can tell "just succeeded" apart from "hasn't been submitted yet" and "was refused".
   */
  succeeded: boolean;
  values: BuildDetails;
};

/** Postgres's unique-violation code: `builds_one_number_per_release`. */
const BUILD_UNIQUE_VIOLATION = "23505";

/**
 * Recording a Build under a Release: a build number, and an optional description of it.
 *
 * Any Member may create one, the same as a Release — see the file comment in
 * `20260928010000_releases_and_builds.sql`. `requireProjectMembership` is checked against the posted
 * `projectId` for the same reason `updateRelease` checks it: a direct POST does not carry the page's own
 * guard with it. It is not, on its own, what stops a Build being inserted under a Release from a
 * *different* Project the caller does not belong to — row-level security's own
 * `is_project_member(release_project_id(release_id))` is what actually decides that, checked against
 * the Release's real Project rather than whatever `projectId` arrived alongside it.
 */
export async function createBuild(
  _previous: NewBuildState,
  formData: FormData,
): Promise<NewBuildState> {
  const projectId = String(formData.get("projectId") ?? "");
  const releaseId = String(formData.get("releaseId") ?? "");
  await requireProjectMembership(projectId);

  const buildNumber = String(formData.get("buildNumber") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const values = { buildNumber, description };

  // The same validation the browser ran, for the same reason every other form in this area runs it twice.
  const errors = validateBuildDetails(values);
  if (Object.keys(errors).length > 0) {
    return { errors, message: null, succeeded: false, values };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("builds").insert({
    release_id: releaseId,
    build_number: buildNumber,
    // An absent description is null, not an empty string, for the reason `createRelease` gives.
    description: description === "" ? null : description,
  });

  if (error) {
    // The database is the authority on uniqueness, not a check this action made a moment earlier: two
    // Members' creates could both pass such a check and only one can win.
    if (error.code === BUILD_UNIQUE_VIOLATION) {
      return {
        errors: {},
        message: buildMessages.buildNumberAlreadyUsed(buildNumber),
        succeeded: false,
        values,
      };
    }

    console.error(`Could not create a Build under Release ${releaseId}`, error);
    return { errors: {}, message: buildMessages.couldNotCreate, succeeded: false, values };
  }

  // The Build list is about to gain a row, and the Router Cache is still holding the version without it.
  // The Release list's Build count is stale for the same reason — it reads the count from this Release too.
  revalidatePath(`/projects/${projectId}/releases`);
  revalidatePath(`/projects/${projectId}/releases/${releaseId}`);

  // Blank, not an echo: a create that worked leaves nothing worth keeping in the form, and the next
  // thing typed into it is a different Build's number, not this one's.
  return { errors: {}, message: null, succeeded: true, values: { buildNumber: "", description: "" } };
}
