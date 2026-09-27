/**
 * The single source of every authentication message a User can see.
 *
 * Nothing formats a message inline. A raw provider error must never reach a User: it leaks
 * internals and makes the product feel unfinished. Anything unrecognised still produces something
 * sensible rather than a blank screen.
 *
 * Ticket 07 completes this catalogue; it carries what tickets up to this point need.
 */
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
} as const;

/** The shape of a provider error, narrowed to what the catalogue is allowed to look at. */
type ProviderError = {
  code?: string | null;
  message?: string | null;
};

const BY_CODE: Record<string, string> = {
  invalid_credentials: authMessages.invalidCredentials,
  email_not_confirmed: authMessages.emailNotConfirmed,
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
