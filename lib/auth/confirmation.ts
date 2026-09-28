import type { EmailOtpType } from "@supabase/supabase-js";

import { safeNext } from "./routes";

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
  /**
   * Where the link says to go afterwards, or null when it says nothing.
   *
   * Null rather than a default, because the caller has a better answer than this module does: the
   * confirmation route weighs it against what registration remembered. A default here would be
   * indistinguishable from a link that named that same path, and from one whose destination was refused.
   */
  next: string | null;
};

function isIssuedType(value: string): value is IssuedType {
  return (ISSUED_TYPES as readonly string[]).includes(value);
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

  const next = params.get("next");

  return { tokenHash, type, next: next === null ? null : safeNext(next, "") || null };
}
