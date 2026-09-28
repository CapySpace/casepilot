import "server-only";

import { cookies } from "next/headers";

import { safeNext } from "./confirmation";

/**
 * Where to send somebody once they have confirmed their email address.
 *
 * The problem this solves: registration from an invitation has to come back to the invitation, and the
 * journey passes through an email. The spec assumed the `next` parameter would carry it "with no new
 * machinery", which turned out to be wrong — the confirmation template hardcodes `next=/`, and the only
 * way to vary it is `emailRedirectTo`, which is an **absolute** URL. Building one means deciding what this
 * site's origin is, and the only thing the server has to go on is a Host header the caller writes; the
 * confirmation route refuses to trust that, for good reasons it states itself.
 *
 * So the destination never leaves this browser. It is written as a cookie when registration begins and
 * read back when the link is followed, which also means it cannot be tampered with in the email: the link
 * carries a token and nothing else worth editing.
 *
 * The cost is honest and small: somebody who registers in one browser and opens the email in another
 * lands on their Projects instead, with the invitation link still in their inbox.
 */
const COOKIE = "casepilot-after-confirmation";

/** Long enough to read an email and follow a link, short enough not to outlive the reason. */
const LIFETIME_SECONDS = 60 * 60;

export async function rememberDestination(path: string): Promise<void> {
  // Reduced by the same guard the confirmation route uses, so a poisoned value is a path on this site or
  // nothing at all. Storing it unchecked would make this cookie an open redirect with a longer fuse.
  const safe = safeNext(path, "");
  if (safe === "") return;

  const jar = await cookies();
  jar.set(COOKIE, safe, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: LIFETIME_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * The remembered destination, consumed.
 *
 * Read once and deleted, so a stale invitation cannot pull somebody sideways on a later confirmation.
 */
export async function takeRememberedDestination(): Promise<string | null> {
  const jar = await cookies();
  const remembered = jar.get(COOKIE)?.value;

  if (remembered === undefined) return null;

  jar.delete(COOKIE);

  // Checked again on the way out. What went in was safe, but a cookie is a value from the browser and
  // this is the last moment before it becomes a redirect.
  const safe = safeNext(remembered, "");
  return safe === "" ? null : safe;
}
