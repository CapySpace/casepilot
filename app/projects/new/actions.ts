"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/auth/dal";
import { projectMessages } from "@/lib/projects/messages";
import {
  validateProjectDetails,
  type ProjectDetails,
  type ProjectErrors,
} from "@/lib/projects/validation";
import { createClient } from "@/lib/supabase/server";

export type NewProjectState = {
  errors: ProjectErrors;
  /** A failure that belongs to no single field. */
  message: string | null;
  /** Echoed back so a rejected attempt does not also cost the User what they typed. */
  values: ProjectDetails;
};

export async function createProject(
  _previous: NewProjectState,
  formData: FormData,
): Promise<NewProjectState> {
  // A Server Action is reachable by a direct POST, not only through the form, so identity is
  // established here and not inherited from whatever rendered the page.
  await verifySession();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const values = { name, description };

  // The same validation the browser ran, for the same reason registration runs it twice: the
  // browser's copy exists for immediate feedback, and this one exists because this action can be
  // called without a form ever having been loaded.
  const errors = validateProjectDetails({ name, description });
  if (Object.keys(errors).length > 0) {
    return { errors, message: null, values };
  }

  const supabase = await createClient();

  // The id is generated here rather than read back from the insert, and that is not a preference.
  // The Owner's Membership is written by an AFTER trigger, while the SELECT policy is applied to an
  // INSERT's RETURNING row *during* the statement — so at that moment the creator is not yet a
  // member of their own Project and the database refuses to hand it back. Asking for the row would
  // get a permission error on a write that had actually succeeded.
  //
  // `created_by` is left to its column default of auth.uid(): the policy checks it against the
  // caller, so sending it would only be a chance to send it wrong.
  const id = randomUUID();
  const { error } = await supabase.from("projects").insert({
    id,
    name,
    // An absent description is null, not an empty string. "Nobody wrote one" and "somebody wrote
    // nothing" are the same fact, and storing two spellings of it means every reader handles both.
    description: description === "" ? null : description,
  });

  if (error) {
    // Nothing is leaked and nothing is guessed: the User is told the attempt failed and saved
    // nothing, and the reason goes where an operator can find it. A constraint the application does
    // not know about looks exactly like this, which is why the message does not promise a retry
    // would work.
    console.error("Could not create a Project", error);
    return { errors: {}, message: projectMessages.couldNotCreate, values };
  }

  // The list is about to gain a row, and the Router Cache is still holding the version without it.
  revalidatePath("/projects");
  redirect(`/projects/${id}`);
}
