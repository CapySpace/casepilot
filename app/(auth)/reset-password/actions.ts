"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { authMessages, messageForAuthError } from "@/lib/auth/messages";
import { validateNewPassword, type NewPasswordErrors } from "@/lib/auth/validation";
import { recoveringUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = {
  errors: NewPasswordErrors;
  message: string | null;
};

export async function resetPassword(
  _previous: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  // The same rules the browser applied for live feedback, run again because the browser's copy is
  // not a security control.
  const errors = validateNewPassword({ password, confirmation });
  if (Object.keys(errors).length > 0) {
    return { errors, message: null };
  }

  // Checked here as well as on the page, because this action is reachable without ever rendering
  // it. Possession of the link is what authorises the change; an ordinary session is not enough.
  if (!(await recoveringUser())) {
    return { errors: {}, message: authMessages.linkExpired };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { errors: {}, message: messageForAuthError(error) };
  }

  // They are signed in already — verifying the token did that — so recovery finishes where signing
  // in would have taken them rather than asking for the password they have just set.
  revalidatePath("/", "layout");
  redirect("/");
}
