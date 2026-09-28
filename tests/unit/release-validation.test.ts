import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MAXIMUM_DESCRIPTION_LENGTH, MAXIMUM_NAME_LENGTH, MAXIMUM_VERSION_LENGTH } from "@/lib/releases/limits";
import { releaseMessages } from "@/lib/releases/messages";
import { validateReleaseDetails } from "@/lib/releases/validation";

describe("validating a Release's details", () => {
  it("accepts a version on its own", () => {
    expect(validateReleaseDetails({ version: "1.0.0", name: "", description: "" })).toEqual({});
  });

  it("accepts a version, a name and a description", () => {
    expect(
      validateReleaseDetails({
        version: "1.0.0",
        name: "Payments Overhaul",
        description: "Stripe 3DS and biometric auth.",
      }),
    ).toEqual({});
  });

  it("refuses a missing version", () => {
    expect(validateReleaseDetails({ version: "", name: "", description: "" })).toEqual({
      version: releaseMessages.versionRequired,
    });
  });

  it("refuses a version that is only whitespace", () => {
    // What the database's own check does: `char_length(trim(version)) between 1 and 100`. A version
    // of spaces would pass a length check and render as an unclickable blank row on the list.
    expect(validateReleaseDetails({ version: "   \t\n ", name: "", description: "" })).toEqual({
      version: releaseMessages.versionRequired,
    });
  });

  it("refuses a version past the limit, measuring it trimmed", () => {
    expect(
      validateReleaseDetails({
        version: "a".repeat(MAXIMUM_VERSION_LENGTH + 1),
        name: "",
        description: "",
      }),
    ).toEqual({ version: releaseMessages.versionTooLong });

    // Trailing spaces are not what makes a version too long; the database trims before it counts.
    expect(
      validateReleaseDetails({
        version: `${"a".repeat(MAXIMUM_VERSION_LENGTH)}   `,
        name: "",
        description: "",
      }),
    ).toEqual({});
  });

  it("does not refuse an empty or whitespace-only name", () => {
    // A NULL fails neither the migration's `between` check, since Postgres treats a NULL comparison
    // as unknown rather than false — the same reading the migration comment gives it. An empty name
    // becomes null on save, not an error here.
    expect(validateReleaseDetails({ version: "1.0.0", name: "", description: "" })).toEqual({});
    expect(validateReleaseDetails({ version: "1.0.0", name: "   ", description: "" })).toEqual({});
  });

  it("refuses a name past the limit", () => {
    expect(
      validateReleaseDetails({
        version: "1.0.0",
        name: "a".repeat(MAXIMUM_NAME_LENGTH + 1),
        description: "",
      }),
    ).toEqual({ name: releaseMessages.nameTooLong });
  });

  it("refuses a description past the limit", () => {
    expect(
      validateReleaseDetails({
        version: "1.0.0",
        name: "",
        description: "a".repeat(MAXIMUM_DESCRIPTION_LENGTH + 1),
      }),
    ).toEqual({ description: releaseMessages.descriptionTooLong });
  });

  it("reports every problem at once", () => {
    expect(
      validateReleaseDetails({
        version: "",
        name: "a".repeat(MAXIMUM_NAME_LENGTH + 1),
        description: "a".repeat(MAXIMUM_DESCRIPTION_LENGTH + 1),
      }),
    ).toEqual({
      version: releaseMessages.versionRequired,
      name: releaseMessages.nameTooLong,
      description: releaseMessages.descriptionTooLong,
    });
  });
});

describe("the stated limits", () => {
  it("are the limits the database enforces", () => {
    // Three things have to agree or a Member is rejected by a rule nothing told them about: the
    // hint on the form, the check in the action, and the constraint in the migration.
    const migrations = join("supabase", "migrations");
    const sql = readdirSync(migrations)
      .map((file) => readFileSync(join(migrations, file), "utf8"))
      .join("\n");

    expect(sql).toContain(
      `check (char_length(trim(version)) between 1 and ${MAXIMUM_VERSION_LENGTH})`,
    );
    expect(sql).toContain(`check (char_length(trim(name)) between 1 and ${MAXIMUM_NAME_LENGTH})`);
    expect(sql).toContain(`check (char_length(description) <= ${MAXIMUM_DESCRIPTION_LENGTH})`);
  });

  it("are stated in the copy the form shows", () => {
    expect(releaseMessages.versionTooLong).toContain(String(MAXIMUM_VERSION_LENGTH));
    expect(releaseMessages.nameTooLong).toContain(String(MAXIMUM_NAME_LENGTH));
    expect(releaseMessages.descriptionTooLong).toContain(String(MAXIMUM_DESCRIPTION_LENGTH));
  });
});
