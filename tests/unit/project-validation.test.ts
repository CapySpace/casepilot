import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MAXIMUM_DESCRIPTION_LENGTH, MAXIMUM_NAME_LENGTH } from "@/lib/projects/limits";
import { projectMessages } from "@/lib/projects/messages";
import { validateProjectDetails } from "@/lib/projects/validation";

describe("validating a Project's details", () => {
  it("accepts a name on its own", () => {
    expect(validateProjectDetails({ name: "Mobile Banking App", description: "" })).toEqual({});
  });

  it("accepts a name and a description", () => {
    expect(
      validateProjectDetails({ name: "Mobile Banking App", description: "Tested weekly." }),
    ).toEqual({});
  });

  it("refuses a missing name", () => {
    expect(validateProjectDetails({ name: "", description: "" })).toEqual({
      name: projectMessages.nameRequired,
    });
  });

  it("refuses a name that is only whitespace", () => {
    // What the database's own check does: `char_length(trim(name)) between 1 and 100`. A name of
    // spaces would pass a length check and render as an unclickable blank row on the dashboard.
    expect(validateProjectDetails({ name: "   \t\n ", description: "" })).toEqual({
      name: projectMessages.nameRequired,
    });
  });

  it("refuses a name past the limit, measuring it trimmed", () => {
    expect(
      validateProjectDetails({ name: "a".repeat(MAXIMUM_NAME_LENGTH + 1), description: "" }),
    ).toEqual({ name: projectMessages.nameTooLong });

    // Trailing spaces are not what makes a name too long; the database trims before it counts, so
    // rejecting this would refuse a name the database would have accepted.
    expect(
      validateProjectDetails({ name: `${"a".repeat(MAXIMUM_NAME_LENGTH)}   `, description: "" }),
    ).toEqual({});
  });

  it("refuses a description past the limit", () => {
    expect(
      validateProjectDetails({
        name: "Mobile Banking App",
        description: "a".repeat(MAXIMUM_DESCRIPTION_LENGTH + 1),
      }),
    ).toEqual({ description: projectMessages.descriptionTooLong });
  });

  it("reports both problems at once", () => {
    expect(
      validateProjectDetails({
        name: "",
        description: "a".repeat(MAXIMUM_DESCRIPTION_LENGTH + 1),
      }),
    ).toEqual({
      name: projectMessages.nameRequired,
      description: projectMessages.descriptionTooLong,
    });
  });
});

describe("the stated limits", () => {
  it("are the limits the database enforces", () => {
    // Three things have to agree or a User is rejected by a rule nothing told them about: the hint on
    // the form, the check in the action, and the constraint in the migration. `terms-version` sets
    // this precedent for exactly the same reason.
    const migrations = join("supabase", "migrations");
    const sql = readdirSync(migrations)
      .map((file) => readFileSync(join(migrations, file), "utf8"))
      .join("\n");

    expect(sql).toContain(`check (char_length(trim(name)) between 1 and ${MAXIMUM_NAME_LENGTH})`);
    expect(sql).toContain(
      `check (char_length(description) <= ${MAXIMUM_DESCRIPTION_LENGTH})`,
    );
  });

  it("are stated in the copy the form shows", () => {
    expect(projectMessages.nameTooLong).toContain(String(MAXIMUM_NAME_LENGTH));
    expect(projectMessages.descriptionTooLong).toContain(String(MAXIMUM_DESCRIPTION_LENGTH));
  });
});
