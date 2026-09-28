"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { safeNext } from "@/lib/auth/routes";
import { authMessages, messageForAuthError } from "@/lib/auth/messages";
import { AUTHENTICATED_HOME } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export type SignInState = {
  message: string | null;
  /**
   * Echoed back so a failed attempt does not also cost the User the address they typed. The
   * password is deliberately not echoed.
   */
  email: string;
};

export async function signIn(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Where they were going before they were asked to sign in — an invitation, usually. Reduced to a path
  // on this site by the same guard the confirmation route uses, so the form cannot be turned into an
  // open redirect by whoever writes the link that leads to it.
  const destination = safeNext(String(formData.get("next") ?? ""), AUTHENTICATED_HOME);

  // The form marks both fields required, but browser validation is not a security control — this
  // action is reachable without it. A blank field is answered with the same non-specific message as
  // a wrong one, so the response says nothing about which addresses exist.
  if (email === "" || password === "") {
    return { message: authMessages.invalidCredentials, email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { message: messageForAuthError(error), email };
  }

  // Not for the server render — the authenticated pages are dynamic and will read the cookies just
  // set. This is for the client-side Router Cache, which is still holding the payload from when this
  // visitor was signed out and would otherwise be reused by the navigation below.
  revalidatePath("/", "layout");
  redirect(destination);
}
