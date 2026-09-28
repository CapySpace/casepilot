/**
 * The public allow-list, and the only place a route becomes reachable without a session.
 *
 * Authentication is default-deny — see ADR-0002 for why this is an allow-list of public paths
 * rather than a list of protected ones. The short version: forgetting locks you out rather than
 * exposing data.
 *
 * Static assets are not listed. They never reach the proxy at all; its matcher excludes them.
 */
/**
 * Where a User goes once CasePilot knows who they are: their Projects.
 *
 * Named once because three places send somebody here — signing in, following a confirmation link,
 * and opening `/` — and a landing page that three files disagree about is a landing page that moves
 * when only two of them are updated.
 */
export const AUTHENTICATED_HOME = "/projects";

export const PUBLIC_PATHS = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/check-email",
  // Serves both email flows, distinguished by the type in its query string.
  "/auth/confirm",
  // Linked from the registration form's consent checkbox, which is read before anyone has a
  // session. An agreement to something you cannot open is not worth recording.
  "/terms",
  "/privacy",
] as const;

const PUBLIC_PATH_SET: ReadonlySet<string> = new Set(PUBLIC_PATHS);

/**
 * The public paths that cannot be written down, because they carry a secret.
 *
 * One entry, and the bar for a second is high. An invitation link is opened by somebody who has never
 * signed in — they may not even have an account yet — so the page has to be reachable without a session,
 * and the token in it means the path is different every time.
 *
 * Every pattern is anchored at **both** ends and describes exactly what it admits: 43 base64url
 * characters, which is what `mintInvitationToken` produces. An unanchored pattern here would be the
 * prefix hole the exact set exists to avoid, with a regular expression to hide it in.
 */
const PUBLIC_PATTERNS: readonly RegExp[] = [/^\/invitations\/[A-Za-z0-9_-]{43}$/];

/**
 * Matching is exact, or against one of the anchored patterns above. Never by prefix: a prefix would make
 * `/sign-in-internal-admin` public, which is the kind of hole nobody notices until it is found for them.
 */
export function isPublicPath(pathname: string): boolean {
  const normalised =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  return (
    PUBLIC_PATH_SET.has(normalised) ||
    PUBLIC_PATTERNS.some((pattern) => pattern.test(normalised))
  );
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
