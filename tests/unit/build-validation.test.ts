import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MAXIMUM_BUILD_NUMBER_LENGTH, MAXIMUM_DESCRIPTION_LENGTH } from "@/lib/builds/limits";
import { buildMessages } from "@/lib/builds/messages";
import { validateBuildDetails } from "@/lib/builds/validation";

describe("validating a Build's details", () => {
  it("accepts a build number on its own", () => {
    expect(validateBuildDetails({ buildNumber: "100", description: "" })).toEqual({});
  });

  it("accepts a build number and a description", () => {
    expect(
      validateBuildDetails({ buildNumber: "100", description: "Nightly regression run." }),
    ).toEqual({});
  });

  it("refuses a missing build number", () => {
    expect(validateBuildDetails({ buildNumber: "", description: "" })).toEqual({
      buildNumber: buildMessages.buildNumberRequired,
    });
  });

  it("refuses a build number that is only whitespace", () => {
    // What the database's own check does: `char_length(trim(build_number)) between 1 and 100`. A
    // build number of spaces would pass a length check and render as an unclickable blank row.
    expect(validateBuildDetails({ buildNumber: "   \t\n ", description: "" })).toEqual({
      buildNumber: buildMessages.buildNumberRequired,
    });
  });

  it("refuses a build number past the limit, measuring it trimmed", () => {
    expect(
      validateBuildDetails({ buildNumber: "1".repeat(MAXIMUM_BUILD_NUMBER_LENGTH + 1), description: "" }),
    ).toEqual({ buildNumber: buildMessages.buildNumberTooLong });

    // Trailing spaces are not what makes a build number too long; the database trims before it counts.
    expect(
      validateBuildDetails({
        buildNumber: `${"1".repeat(MAXIMUM_BUILD_NUMBER_LENGTH)}   `,
        description: "",
      }),
    ).toEqual({});
  });

  it("refuses a description past the limit", () => {
    expect(
      validateBuildDetails({
        buildNumber: "100",
        description: "a".repeat(MAXIMUM_DESCRIPTION_LENGTH + 1),
      }),
    ).toEqual({ description: buildMessages.descriptionTooLong });
  });

  it("reports every problem at once", () => {
    expect(
      validateBuildDetails({ buildNumber: "", description: "a".repeat(MAXIMUM_DESCRIPTION_LENGTH + 1) }),
    ).toEqual({
      buildNumber: buildMessages.buildNumberRequired,
      description: buildMessages.descriptionTooLong,
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
      `check (char_length(trim(build_number)) between 1 and ${MAXIMUM_BUILD_NUMBER_LENGTH})`,
    );
    expect(sql).toContain(`check (char_length(description) <= ${MAXIMUM_DESCRIPTION_LENGTH})`);
  });

  it("are stated in the copy the form shows", () => {
    expect(buildMessages.buildNumberTooLong).toContain(String(MAXIMUM_BUILD_NUMBER_LENGTH));
    expect(buildMessages.descriptionTooLong).toContain(String(MAXIMUM_DESCRIPTION_LENGTH));
  });
});
