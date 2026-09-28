"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/auth/dal";
import { requireProjectMembership } from "@/lib/projects/dal";
import { projectMessages } from "@/lib/projects/messages";
import { createClient } from "@/lib/supabase/server";

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
