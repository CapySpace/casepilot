"use server";

import { revalidatePath } from "next/cache";

import { requireProjectOwnership } from "@/lib/projects/dal";
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
