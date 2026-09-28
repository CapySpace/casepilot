import { MAXIMUM_BUILD_NUMBER_LENGTH, MAXIMUM_DESCRIPTION_LENGTH } from "./limits";
import { buildMessages } from "./messages";

export type BuildDetails = {
  buildNumber: string;
  description: string;
};

export type BuildErrors = Partial<Record<"buildNumber" | "description", string>>;

/**
 * Runs in the browser for immediate feedback and again in the Server Action, because browser
 * validation is not a security control — the action is reachable without ever loading the form.
 *
 * `description` is optional: an empty or whitespace-only value is not an error here, the same reading
 * the migration gives a NULL — see `lib/releases/validation.ts`'s own comment. Only a value that is
 * present and too long is refused.
 */
export function validateBuildDetails({ buildNumber, description }: BuildDetails): BuildErrors {
  const errors: BuildErrors = {};

  const trimmedBuildNumber = buildNumber.trim();
  if (trimmedBuildNumber === "") {
    errors.buildNumber = buildMessages.buildNumberRequired;
  } else if (trimmedBuildNumber.length > MAXIMUM_BUILD_NUMBER_LENGTH) {
    errors.buildNumber = buildMessages.buildNumberTooLong;
  }

  if (description.trim().length > MAXIMUM_DESCRIPTION_LENGTH) {
    errors.description = buildMessages.descriptionTooLong;
  }

  return errors;
}
