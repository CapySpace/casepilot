/**
 * The single source of every authentication message a User can see.
 *
 * Nothing formats a message inline. A raw provider error must never reach a User: it leaks
 * internals and makes the product feel unfinished. Anything unrecognised still produces something
 * sensible rather than a blank screen.
 *
 * Ticket 07 completes this catalogue; it carries what tickets up to this point need.
 */

/**
 * The password rule, stated exactly as it is enforced.
 *
 * It lives here once because three things have to agree, and drift between them is invisible until
 * somebody is locked out: the hint on the form, the checks in `lib/auth/validation.ts`, and
 * Supabase's own policy in `supabase/config.toml`. The provider enforces it too, so the rule cannot
 * be sidestepped by calling the API directly.
 *
 * The designs drew "a number or symbol". The provider has no such policy — only letters and digits
 * — and enforcing nothing at the API was judged the worse trade, so the stated rule is marginally
 * stricter than the drawing. The copy states what is actually enforced, never the drawing.
 *
 * Shown as the hint under the password field, and reused in the message a failed one gets.
 */
export const PASSWORD_RULE = "At least 8 characters, including a letter and a number";

export const authMessages = {
  /**
   * Deliberately says nothing about whether the address is registered.
   *
   * The provider helps here: a wrong password, and an address that has never been seen, both come
   * back as `invalid_credentials` — verified against the running stack. So one message for the two
   * of them costs nothing and closes the enumeration hole. CasePilot holds a company's defect
   * data; a form that confirms which colleagues have logins is a real leak.
   */
  invalidCredentials: "That email address and password do not match. Check both and try again.",

  /**
   * Safe to be specific. The provider returns `email_not_confirmed` only when the password was
   * *correct*, so whoever sees this already had the credentials — it tells an attacker nothing
   * they did not supply themselves.
   */
  emailNotConfirmed:
    "Confirm your email address before signing in. Check your inbox for the link we sent you.",

  unexpected: "Something went wrong. Try again in a moment.",

  // Registration. These are what the form shows beside a field the User has to fix.
  fullNameRequired: "Enter your full name.",
  emailRequired: "Enter your work email address.",
  emailMalformed: "That does not look like an email address.",
  passwordTooWeak: `Your password must be ${PASSWORD_RULE.toLowerCase()}.`,
  termsRequired: "Agree to the Terms of Service and Privacy Policy to continue.",
} as const;

/** The shape of a provider error, narrowed to what the catalogue is allowed to look at. */
type ProviderError = {
  code?: string | null;
  message?: string | null;
};

const BY_CODE: Record<string, string> = {
  invalid_credentials: authMessages.invalidCredentials,
  email_not_confirmed: authMessages.emailNotConfirmed,
  // Should be unreachable: the form enforces the same rule before submitting. Mapped anyway,
  // because the alternative if the two ever drift is a shrug where the rule should be.
  weak_password: authMessages.passwordTooWeak,
};

/**
 * Turns a provider error into something a User can act on.
 *
 * Note what this does not do: it never reads `error.message`. The provider's own text is not a
 * fallback, it is the thing being kept out.
 */
export function messageForAuthError(error: ProviderError | null | undefined): string {
  const code = error?.code;
  if (!code) return authMessages.unexpected;

  return BY_CODE[code] ?? authMessages.unexpected;
}
