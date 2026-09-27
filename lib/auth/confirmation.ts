import type { EmailOtpType } from "@supabase/supabase-js";

import { AUTHENTICATED_HOME } from "./routes";

/**
 * The two token types CasePilot issues. Both arrive at the same confirmation endpoint and are told
 * apart by this, exactly as the email templates write them.
 *
 * The provider understands more — invite, magiclink, email_change — and they are deliberately not
 * here. Honouring a type this product has no flow for would mean acting on a link we never sent.
 */
const ISSUED_TYPES = ["signup", "recovery"] as const satisfies readonly EmailOtpType[];

type IssuedType = (typeof ISSUED_TYPES)[number];

export type ConfirmationLink = {
  tokenHash: string;
  type: IssuedType;
  next: string;
};

function isIssuedType(value: string): value is IssuedType {
  return (ISSUED_TYPES as readonly string[]).includes(value);
}

/** Only ever used to resolve a relative path; never appears in a redirect. */
const PROBE_ORIGIN = "http://resolve.invalid";

/**
 * The onward destination, reduced to something safe to redirect to.
 *
 * It arrives in a URL that anybody can write. Redirecting wherever it points would be an open
 * redirect, and a link that verifies a genuine token before landing the User on somebody else's
 * sign-in page is a credible piece of phishing — the first half really is from us.
 *
 * So: a path on this site, or the authenticated area. Nothing else.
 */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;

  // Parse it rather than pattern-match it. The URL parser is the authority on what a browser will
  // do with a string — it strips tabs and newlines, normalises backslashes into slashes, and
  // resolves `..` — and every hand-rolled rule here was a guess at that behaviour.
  let resolved: URL;
  try {
    resolved = new URL(next, PROBE_ORIGIN);
  } catch {
    return fallback;
  }

  // Anything absolute, protocol-relative, or carrying its own scheme has moved off the probe
  // origin by now. `javascript:` lands here too, with an origin of "null".
  if (resolved.origin !== PROBE_ORIGIN) return fallback;

  const path = `${resolved.pathname}${resolved.search}`;

  // `/..//evil.example` is same-origin when parsed, but normalises to a path that would be read as
  // a host the *next* time it is resolved. Check the result, not just the input.
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;

  return path;
}

/**
 * Reads a confirmation link's query string.
 *
 * Returns null when the link is not one we could have sent — no token, no type, or a type this
 * product does not issue. That is a different failure from the provider rejecting a well-formed
 * token, and the two get different explanations, because "this link is wrong" and "this link has
 * run out" ask the User to do different things.
 */
export function parseConfirmationLink(params: URLSearchParams): ConfirmationLink | null {
  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  if (!tokenHash || !type || !isIssuedType(type)) return null;

  return { tokenHash, type, next: safeNext(params.get("next"), AUTHENTICATED_HOME) };
}
