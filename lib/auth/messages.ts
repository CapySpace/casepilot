/**
 * The single source of every authentication message a User can see.
 *
 * Nothing formats a message inline. A raw provider error must never reach a User: it leaks
 * internals and makes the product feel unfinished. Anything unrecognised still produces something
 * sensible rather than a blank screen.
 *
 * What belongs here: anything that tells a User the outcome or state of an authentication attempt.
 * What does not: the words that name a screen or a control — headings, field labels, button text.
 * Those are the interface; these are what it says back.
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

/** Its other half: what the same hint says once the rule is met. */
export const PASSWORD_RULE_MET = "Password meets the requirements";

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
  passwordsDoNotMatch: "Those two passwords are not the same. Type the new one again.",

  // Email links. The provider cannot tell these apart — a consumed token, a tampered one and a
  // genuinely expired one all come back `otp_expired`, verified against the running stack — so the
  // split here is one CasePilot can actually make: a link that is malformed, against a token the
  // provider refused. The second message covers expiry and reuse together, because claiming to
  // know which would be a guess.
  linkInvalid: "That link is not valid. Open the most recent email we sent you and use the link in it.",
  linkExpired:
    "That link has expired or has already been used. Links last about an hour — request a new one and follow it from your email.",

  /**
   * Shown when a session that was working has stopped working — expired, or ended somewhere else.
   *
   * Distinct from arriving signed out, which needs no explanation at all. Being returned to a
   * sign-in form mid-task with no account of why is the thing this prevents.
   */
  sessionExpired: "Your session has ended. Sign in again to pick up where you left off.",

  // Registration and recovery both end on a page that says something was sent. Neither says
  // whether the address was registered, and the recovery one especially must not.
  confirmationSent: "Follow the link we have just sent you to finish signing up.",
  confirmBeforeSignIn:
    "You cannot sign in until your address is confirmed. If nothing arrives within a few minutes, check your spam folder.",
  resetLinkSent:
    "If that address belongs to a CasePilot User, a link to choose a new password is on its way. Check your inbox, and your spam folder.",
} as const;

/** The shape of a provider error, narrowed to what the catalogue is allowed to look at. */
type ProviderError = {
  code?: string | null;
  message?: string | null;
};

/** Every provider code CasePilot translates. Exported so a test can walk it. */
export const PROVIDER_ERROR_MESSAGES: Record<string, string> = {
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
/**
 * What the sign-in screen should say about however somebody arrived at it.
 *
 * A key, never the message itself: whatever redirects here puts this in the query string, and
 * putting text there would let anybody with a URL put words in CasePilot's mouth.
 *
 * Not all of these come from a link — a session can end without one — which is why this is not
 * named for links.
 */
export const authNotices = {
  "invalid-link": authMessages.linkInvalid,
  "expired-link": authMessages.linkExpired,
  "session-expired": authMessages.sessionExpired,
} as const;

export type AuthNotice = keyof typeof authNotices;

/** Null when there is nothing to report, or the key is not one we issue. */
export function messageForNotice(key: string | string[] | undefined): string | null {
  if (typeof key !== "string") return null;

  return authNotices[key as AuthNotice] ?? null;
}

export function messageForAuthError(error: ProviderError | null | undefined): string {
  const code = error?.code;
  if (!code) return authMessages.unexpected;

  return PROVIDER_ERROR_MESSAGES[code] ?? authMessages.unexpected;
}
