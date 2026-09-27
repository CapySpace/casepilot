import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The secret key exists only so the test suite can mint verification and recovery links through the
 * administrative API. It carries no NEXT_PUBLIC_ prefix, so Next.js will not inline it into the
 * browser bundle — but an import from the rendering tree would still pull it into a server bundle
 * that renders pages, which is the mistake this guards against.
 *
 * Grepping the tree is a blunt instrument, and deliberately so: the failure it prevents is silent,
 * and the alternative is noticing by review.
 */

const SECRET_KEY_NAME = "SUPABASE_SECRET_KEY";

// Everything Next.js compiles into the application. Not tests/, which is where the key belongs.
const RENDERING_TREE = ["app", "components", "lib", "hooks", "proxy.ts", "next.config.ts"];

function sourceFilesUnder(path: string): string[] {
  let entry;
  try {
    entry = statSync(path);
  } catch {
    // Not every path exists yet — proxy.ts arrives with ticket 02, hooks/ later still.
    return [];
  }

  if (entry.isFile()) {
    return /\.(ts|tsx|js|jsx|mjs|cjs|css)$/.test(path) ? [path] : [];
  }

  return readdirSync(path).flatMap((child) => sourceFilesUnder(join(path, child)));
}

describe("the secret key stays out of the application", () => {
  it("is not referenced anywhere Next.js compiles into the application", () => {
    const offenders = RENDERING_TREE.flatMap(sourceFilesUnder).filter((file) =>
      readFileSync(file, "utf8").includes(SECRET_KEY_NAME),
    );

    expect(offenders).toEqual([]);
  });

  it("is declared without a public prefix", () => {
    const declarations = readFileSync(".env.example", "utf8")
      .split("\n")
      .map((line) => line.match(/^([A-Z0-9_]+)=/)?.[1])
      .filter((name): name is string => name !== undefined);

    expect(declarations).toContain(SECRET_KEY_NAME);
    expect(declarations.filter((name) => name.includes("SECRET"))).toEqual([SECRET_KEY_NAME]);
  });
});
