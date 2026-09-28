import "server-only";

import { cookies } from "next/headers";

import { safeNext } from "./routes";

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
 *
 * It is bound to the **address**, not just the browser. Without that, a shared machine leaks: one person
 * begins registering from an invitation, and whoever next confirms *anything* in that browser is handed
 * the destination — landing on an invitation page that names a Project, an inviter and somebody else's
 * address to a reader who never held the token. That is precisely the disclosure the page justifies by
 * saying the token is what you must hold, so the cookie carries who it is for and is honoured for nobody
 * else.
 */
const COOKIE = "casepilot-after-confirmation";

/** Long enough to read an email and follow a link, short enough not to outlive the reason. */
const LIFETIME_SECONDS = 60 * 60;

export async function rememberDestination(path: string, email: string): Promise<void> {
  // Reduced by the same guard the confirmation route uses, so a poisoned value is a path on this site or
  // nothing at all. Storing it unchecked would make this cookie an open redirect with a longer fuse.
  const safe = safeNext(path, "");
  const jar = await cookies();

  // Nothing to remember clears what was remembered before. Otherwise somebody who starts from an
  // invitation, abandons it, and registers plainly within the hour is delivered to the old invitation by a
  // cookie nobody meant to leave behind.
  if (safe === "" || email.trim() === "") {
    jar.delete(COOKIE);
    return;
  }

  // The address first, then the path: an address cannot contain a space, so one split is unambiguous
  // however odd the path is.
  jar.set(COOKIE, `${email.trim().toLowerCase()} ${safe}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: LIFETIME_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * The remembered destination, for the person who just confirmed their address — and nobody else.
 *
 * Consumed when it is theirs, so a spent destination cannot pull them sideways on a later confirmation.
 * Left alone when it is not: somebody else on this browser may still be waiting for it, and it expires on
 * its own within the hour either way.
 */
export async function takeRememberedDestination(email: string | null): Promise<string | null> {
  const jar = await cookies();
  const remembered = jar.get(COOKIE)?.value;

  if (remembered === undefined) return null;

  const separator = remembered.indexOf(" ");
  const rememberedFor = separator === -1 ? "" : remembered.slice(0, separator);
  const path = separator === -1 ? "" : remembered.slice(separator + 1);

  // Unreadable, so it can only be something this application did not write. Removed rather than left to
  // rot.
  if (rememberedFor === "" || path === "") {
    jar.delete(COOKIE);
    return null;
  }

  // Somebody else's. Left where it is, and emphatically not followed: it names a Project and an address
  // that are none of this reader's business.
  if (email === null || email.trim().toLowerCase() !== rememberedFor) return null;

  jar.delete(COOKIE);

  // Checked again on the way out. What went in was safe, but a cookie is a value from the browser and
  // this is the last moment before it becomes a redirect.
  const safe = safeNext(path, "");
  return safe === "" ? null : safe;
}
