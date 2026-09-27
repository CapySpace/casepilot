/**
 * The public allow-list, and the only place a route becomes reachable without a session.
 *
 * Authentication is default-deny — see ADR-0002 for why this is an allow-list of public paths
 * rather than a list of protected ones. The short version: forgetting locks you out rather than
 * exposing data.
 *
 * Static assets are not listed. They never reach the proxy at all; its matcher excludes them.
 */
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
 * Matching is exact, not by prefix. A prefix would make `/sign-in-internal-admin` public, which is
 * the kind of hole nobody notices until it is found for them.
 */
export function isPublicPath(pathname: string): boolean {
  const normalised =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  return PUBLIC_PATH_SET.has(normalised);
}

