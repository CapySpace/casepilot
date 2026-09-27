import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { TERMS_VERSION } from "@/lib/auth/terms";

/**
 * The version stamped on a profile comes from a column default in the database, not from the
 * application. This constant mirrors it so tests and copy can name the current version — and this
 * test is what stops the mirror going stale, which would otherwise be invisible until somebody
 * needed to prove what a User agreed to.
 */
describe("the terms version", () => {
  it("matches the default the database stamps", () => {
    const migrations = join("supabase", "migrations");
    const sql = readdirSync(migrations)
      .map((file) => readFileSync(join(migrations, file), "utf8"))
      .join("\n");

    const defaults = [...sql.matchAll(/terms_version\s+text\s+not null\s+default\s+'([^']+)'/g)].map(
      (match) => match[1],
    );

    expect(defaults).toContain(TERMS_VERSION);
  });
});
