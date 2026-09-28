"use server";

import { redirect } from "next/navigation";

import { rememberDestination } from "@/lib/auth/destination";
import { messageForAuthError } from "@/lib/auth/messages";
import { validateRegistration, type RegistrationErrors } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

/**
 * Provider failures that are answered with the same page a genuine registration gets.
 *
 * `user_already_exists` is the anti-enumeration one. Telling the truth would turn this form into a
 * way of discovering which of somebody's colleagues have logins, and CasePilot holds a company's
 * defect data. The spec and ADR-0001 both predicted the provider would obfuscate this for us; it no
 * longer does, so the property is enforced here. Verified against the running stack.
 *
 * `over_email_send_rate_limit` is the double-submit one. The provider refuses to send a second
 * confirmation to the same address within a second of the first, so this means the email they are
 * about to be told to look for has just gone out. "Check your email" is the true answer, and the
 * alternative — a shrug — is what a User would get for pressing the button twice.
 */
const ANSWERED_AS_SUCCESS = new Set(["user_already_exists", "over_email_send_rate_limit"]);

export type SignUpState = {
  errors: RegistrationErrors;
  /** A failure that belongs to no single field. */
  message: string | null;
  /** Echoed back so a rejected attempt does not also cost the User what they typed. */
  values: {
    fullName: string;
    email: string;
  };
};

export async function signUp(_previous: SignUpState, formData: FormData): Promise<SignUpState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const acceptedTerms = formData.get("terms") === "on";
  // The invitation they came from, kept in a cookie rather than in the confirmation link: the link is
  // built by the provider from a template, and varying it means handing the provider an absolute URL —
  // which means deciding this site's origin from a Host header. See `lib/auth/destination.ts`.
  const destination = String(formData.get("next") ?? "");

  const values = { fullName, email };

  // The same validation the browser ran. Not a duplicate by accident: the browser's copy exists for
  // live feedback, and this one exists because the action is reachable without ever loading a form.
  const errors = validateRegistration({ fullName, email, password, acceptedTerms });
  if (Object.keys(errors).length > 0) {
    return { errors, message: null, values };
  }

  // Before the attempt, so it is remembered whether or not the address turns out to be new: an
  // already-registered address gets the same check-email page, and following its link should still land
  // where they were going.
  await rememberDestination(destination, email);

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read by the database trigger that creates the profile. Only the name travels this way:
      // metadata is whatever the caller sent, and the anon key is public, so when and to what
      // somebody agreed is stamped by the database instead. See the trigger's own comment.
      data: { full_name: fullName },
    },
  });

  if (error && !ANSWERED_AS_SUCCESS.has(error.code ?? "")) {
    return { errors: {}, message: messageForAuthError(error), values };
  }

  // The address travels in the URL so that the next page survives a refresh, and still says
  // something useful if the User comes back to it later.
  redirect(`/check-email?email=${encodeURIComponent(email)}`);
}
