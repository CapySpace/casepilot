"use server";

import { authMessages } from "@/lib/auth/messages";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = {
  /** True once the request has been made, whatever the address turned out to be. */
  sent: boolean;
  error: string | null;
  email: string;
};

export async function requestPasswordReset(
  _previous: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();

  // The only thing worth rejecting here is an address that cannot receive anything. Saying "that
  // is not an email address" reveals nothing, because it is true of the string, not of any User.
  if (email === "") {
    return { sent: false, error: authMessages.emailRequired, email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  // The outcome is not reported, deliberately. An address that has never been seen and one that
  // belongs to a colleague must produce the same page, or this form becomes a way to find out who
  // has a login — the same property registration has, for the same reason.
  //
  // The provider happens to do the right thing already: it answers 200 either way and sends
  // nothing to an unknown address, verified against the running stack. Relying on that would be a
  // mistake. Ticket 04 found the equivalent registration behaviour had changed under us between
  // the spec being written and the work being done, so the guarantee is made here.
  if (error) {
    console.error("A password reset request failed at the provider", error);
  }

  return { sent: true, error: null, email };
}
