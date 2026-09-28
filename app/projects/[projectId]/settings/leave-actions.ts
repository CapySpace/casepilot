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
  await requireProjectMembership(projectId);

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  if (error) {
    console.error(`User ${user.id} could not leave Project ${projectId}`, error);
    return { message: projectMessages.couldNotLeave };
  }

  // Both caches: the Projects list has lost a row, and the Project's own pages are no longer readable by
  // this User at all.
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`, "layout");
  redirect("/projects");
}
