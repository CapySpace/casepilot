/**
 * What CasePilot will accept as an email address.
 *
 * Deliberately unambitious, and it moved here from `lib/auth/validation.ts` when a second caller
 * arrived: inviting a colleague asks the same question registration does, and two regular expressions
 * for one rule is two answers waiting to disagree.
 *
 * A regular expression cannot decide whether an address is real — only a message sent to it can. This
 * rejects what is obviously not an address and leaves the rest to the email that follows.
 */
export function isEmailShaped(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
