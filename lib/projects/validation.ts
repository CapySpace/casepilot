import { isEmailShaped } from "@/lib/email";

import { MAXIMUM_DESCRIPTION_LENGTH, MAXIMUM_NAME_LENGTH } from "./limits";
import { projectMessages } from "./messages";

export type ProjectDetails = {
  name: string;
  description: string;
};

export type ProjectErrors = Partial<Record<"name" | "description", string>>;

/**
 * Runs in the browser for immediate feedback and again in the Server Action, because browser
 * validation is not a security control — the action is reachable without ever loading the form.
 *
 * Returns every bad field at once, for the reason `validateRegistration` gives: being told about one
 * problem at a time costs a round trip each time.
 *
 * The rules are the database's rules, stated in TypeScript. Where they disagree the database wins and
 * the User gets an opaque failure, so they are kept in step by a test rather than by memory.
 */
export function validateProjectDetails({ name, description }: ProjectDetails): ProjectErrors {
  const errors: ProjectErrors = {};

  // Trimmed before measuring, both ends of the rule, because that is what the check constraint does.
  const trimmedName = name.trim();

  if (trimmedName === "") {
    errors.name = projectMessages.nameRequired;
  } else if (trimmedName.length > MAXIMUM_NAME_LENGTH) {
    errors.name = projectMessages.nameTooLong;
  }

  // Not trimmed: the constraint counts the description as stored, and the action stores what was
  // typed minus surrounding whitespace, so the two agree at the only length that matters.
  if (description.trim().length > MAXIMUM_DESCRIPTION_LENGTH) {
    errors.description = projectMessages.descriptionTooLong;
  }

  return errors;
}

export type InvitationInput = {
  email: string;
};

export type InvitationErrors = Partial<Record<"email", string>>;

/**
 * The rules for inviting somebody: an address, and one that looks like one.
 *
 * Whether they are *already* invited or already a Member is not asked here. Those are facts about the
 * Project rather than about the input, only the database knows them, and a pure function that pretended
 * to would be guessing.
 */
export function validateInvitation({ email }: InvitationInput): InvitationErrors {
  const trimmed = email.trim();

  if (trimmed === "") return { email: projectMessages.inviteeRequired };
  if (!isEmailShaped(trimmed)) return { email: projectMessages.inviteeMalformed };

  return {};
}
