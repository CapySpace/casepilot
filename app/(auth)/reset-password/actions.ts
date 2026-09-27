"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { authMessages, messageForAuthError } from "@/lib/auth/messages";
import { validateNewPassword, type NewPasswordErrors } from "@/lib/auth/validation";
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

  const supabase = await createClient();

  // The session here came from verifying the recovery token, so possession of the link is what
  // authorises the change. Without one there is nothing to update, and saying so is better than a
  // provider error about a missing session.
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return { errors: {}, message: authMessages.linkExpired };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { errors: {}, message: messageForAuthError(error) };
  }

  // They are signed in already — verifying the token did that — so recovery finishes where signing
  // in would have taken them rather than asking for the password they have just set.
  revalidatePath("/", "layout");
  redirect("/");
}
