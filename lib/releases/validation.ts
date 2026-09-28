import { MAXIMUM_DESCRIPTION_LENGTH, MAXIMUM_NAME_LENGTH, MAXIMUM_VERSION_LENGTH } from "./limits";
import { releaseMessages } from "./messages";

export type ReleaseDetails = {
  version: string;
  name: string;
  description: string;
};

export type ReleaseErrors = Partial<Record<"version" | "name" | "description", string>>;

/**
 * Runs in the browser for immediate feedback and again in the Server Action, because browser
 * validation is not a security control — the action is reachable without ever loading the form.
 *
 * `name` and `description` are optional: an empty or whitespace-only value is not an error here, the
 * same reading the migration gives a NULL — see the check constraints' own comment in
 * `20260928010000_releases_and_builds.sql`. Only a value that is present and too long is refused.
 */
export function validateReleaseDetails({ version, name, description }: ReleaseDetails): ReleaseErrors {
  const errors: ReleaseErrors = {};

  const trimmedVersion = version.trim();
  if (trimmedVersion === "") {
    errors.version = releaseMessages.versionRequired;
  } else if (trimmedVersion.length > MAXIMUM_VERSION_LENGTH) {
    errors.version = releaseMessages.versionTooLong;
  }

  if (name.trim().length > MAXIMUM_NAME_LENGTH) {
    errors.name = releaseMessages.nameTooLong;
  }

  if (description.trim().length > MAXIMUM_DESCRIPTION_LENGTH) {
    errors.description = releaseMessages.descriptionTooLong;
  }

  return errors;
}
