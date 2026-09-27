import { authMessages } from "./messages";

const MINIMUM_PASSWORD_LENGTH = 8;

export type PasswordChecks = {
  longEnough: boolean;
  hasLetter: boolean;
  hasDigit: boolean;
};

/**
 * Each rule reported separately, so the form can show a User which part of the password they have
 * satisfied while they are still typing rather than rejecting the whole thing afterwards.
 */
export function checkPassword(password: string): PasswordChecks {
  return {
    longEnough: password.length >= MINIMUM_PASSWORD_LENGTH,
    // ASCII deliberately, not `\p{L}`. Supabase's letters_digits policy is the literal ASCII
    // alphabet — verified by signing up with "ñññññññ1", which the API rejects as weak_password.
    // A Unicode-aware check here would accept passwords the provider then refuses.
    hasLetter: /[A-Za-z]/.test(password),
    hasDigit: /\d/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  return Object.values(checkPassword(password)).every(Boolean);
}

/**
 * Deliberately unambitious. A regular expression cannot decide whether an address is real — only
 * the verification email can, and that is the whole point of sending one. This rejects what is
 * obviously not an address and leaves the rest to the provider.
 */
function isEmailShaped(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type RegistrationInput = {
  fullName: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
};

export type RegistrationErrors = Partial<
  Record<"fullName" | "email" | "password" | "terms", string>
>;

/**
 * Runs in the browser for live feedback and again in the Server Action, because browser validation
 * is not a security control — the action is reachable without ever loading the form.
 *
 * Returns every bad field at once. Fixing one thing only to be told about the next is a worse
 * experience than being told everything up front, and costs an extra round trip each time.
 */
export function validateRegistration(input: RegistrationInput): RegistrationErrors {
  const errors: RegistrationErrors = {};

  if (input.fullName.trim() === "") {
    errors.fullName = authMessages.fullNameRequired;
  }

  if (input.email.trim() === "") {
    errors.email = authMessages.emailRequired;
  } else if (!isEmailShaped(input.email.trim())) {
    errors.email = authMessages.emailMalformed;
  }

  if (!isPasswordValid(input.password)) {
    errors.password = authMessages.passwordTooWeak;
  }

  if (!input.acceptedTerms) {
    errors.terms = authMessages.termsRequired;
  }

  return errors;
}
