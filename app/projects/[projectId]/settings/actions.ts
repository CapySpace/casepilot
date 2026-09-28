"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/auth/dal";
import { requireProjectMembership, requireProjectOwnership } from "@/lib/projects/dal";
import { projectMessages } from "@/lib/projects/messages";
import {
  validateProjectDetails,
  type ProjectDetails,
  type ProjectErrors,
} from "@/lib/projects/validation";
import { createClient } from "@/lib/supabase/server";

export type ProjectSettingsState = {
  errors: ProjectErrors;
  /** A failure that belongs to no single field. */
  message: string | null;
  /** Said once, after a save that worked. */
  notice: string | null;
  values: ProjectDetails;
};

/**
 * Changing a Project's name and description.
 *
 * The Project's id arrives in a hidden field, and `requireProjectOwnership` below is what makes that
 * safe: a caller who edits the field to another Project's id gets the same 404 a stranger gets, and
 * row-level security refuses the write underneath that. The field is an argument, not a permission.
 *
 * It was `updateProject.bind(null, projectId)` first, which is tidier and does not work: measured
 * against Next.js 16.3.6, a `bind`-ed Server Action driven by `useActionState` does **not**
 * progressively enhance. With the client bundle disabled the POST hangs in application code for as
 * long as the browser will wait — 24 to 49 seconds — and is then aborted, while the same action
 * unbound answers in 116ms. `tests/e2e/project-shell.spec.ts` covers the no-JavaScript path, which is
 * what caught it.
 */
export async function updateProject(
  _previous: ProjectSettingsState,
  formData: FormData,
): Promise<ProjectSettingsState> {
  const projectId = String(formData.get("projectId") ?? "");
  // A Server Action is reachable by direct POST, so ownership is established here and not inherited
  // from whatever rendered the form. A Member gets the same 404 a stranger gets.
  await requireProjectOwnership(projectId);

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const values = { name, description };

  const errors = validateProjectDetails({ name, description });
  if (Object.keys(errors).length > 0) {
    return { errors, message: null, notice: null, values };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ name, description: description === "" ? null : description })
    .eq("id", projectId);

  if (error) {
    console.error(`Could not update Project ${projectId}`, error);
    return { errors: {}, message: projectMessages.couldNotUpdate, notice: null, values };
  }

  // The name is rendered by the sidebar in the layout above this page, and by the Projects list, so
  // both have to be told. `"layout"` reaches the shell; the list is a separate route.
  revalidatePath(`/projects/${projectId}`, "layout");
  revalidatePath("/projects");

  return { errors: {}, message: null, notice: projectMessages.projectUpdated, values };
}

export type LeaveState = {
  message: string | null;
};

/**
 * Leaving a Project.
 *
 * The Membership is what made the Project visible, so deleting it is the whole of leaving — there is no
 * second bookkeeping step, and nothing to forget. An Owner cannot: no policy admits deleting an owner row,
 * and a trigger refuses it even for the service role, because a Project without an Owner is nobody's to
 * manage and this phase cannot hand one on.
 */
export async function leaveProject(_previous: LeaveState, formData: FormData): Promise<LeaveState> {
  const user = await verifySession();
  const projectId = String(formData.get("projectId") ?? "");

  // 404s a non-member, so a stranger posting this learns nothing about which Project ids are real.
  const project = await requireProjectMembership(projectId);

  // The interface offers an Owner no Leave control, and this is what answers one who posts anyway: the
  // reason, not a failure. The policies and the trigger refuse it underneath regardless.
  if (project.role === "owner") {
    return { message: projectMessages.ownerCannotLeave };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    console.error(`User ${user.id} could not leave Project ${projectId}`, error);
    return { message: projectMessages.couldNotLeave };
  }

  // `.select()` is what makes a refusal visible. A delete that row-level security reduces to nothing comes
  // back with no error at all, so without this the action would redirect as though somebody had left a
  // Project they are still in — reporting the opposite of what the database did.
  if ((data ?? []).length === 0) {
    console.error(`Leaving Project ${projectId} was refused for User ${user.id}`);
    return { message: projectMessages.couldNotLeave };
  }

  // Both caches: the Projects list has lost a row, and the Project's own pages are no longer readable by
  // this User at all.
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`, "layout");
  redirect("/projects");
}
