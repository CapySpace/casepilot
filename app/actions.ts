"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { safeNext } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export async function signOut(formData: FormData) {
  // Where to land afterwards, when the caller has a reason to say. The invitation page does: somebody
  // holding a link addressed to a colleague needs to come back to it as the right person, not be dropped
  // on a bare sign-in form. Reduced by the same guard every other redirect uses.
  const requested = String(formData.get("next") ?? "");
  const destination = safeNext(requested, "/sign-in");

  const supabase = await createClient();

  // No scope argument: the provider's default revokes the refresh token server-side rather than
  // only dropping the cookies, which is the difference between the session being gone and the
  // interface merely looking signed out. Phase 1 takes the provider's session defaults throughout.
  //
  // An error here is deliberately not surfaced to the User. Whatever happened at the provider, the
  // safe thing for somebody stepping away from a borrowed machine is to clear this browser and land
  // them on sign-in — never to leave them looking at a signed-in page above an error. The library
  // drops the local session either way.
  //
  // It is logged rather than swallowed, because the case it hides is a real one: if revocation
  // failed, the refresh token is still live at the provider and nobody would otherwise know.
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Sign-out did not revoke the session at the provider", error);
  }

  // Scoped to the root layout, so every cached authenticated route goes, not only `/`. Drops the
  // client-side Router Cache, which Next.js reuses on back/forward navigation and would otherwise
  // replay the authenticated page from a payload captured while they were still signed in. The
  // browser's own back/forward cache is a separate thing, handled by `no-store` in proxy.ts.
  revalidatePath("/", "layout");
  redirect(destination);
}
