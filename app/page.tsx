import { redirect } from "next/navigation";

import { AUTHENTICATED_HOME } from "@/lib/auth/routes";

/**
 * The root is a signpost, not a page.
 *
 * A signed-in User's home is their Projects; a signed-out visitor never gets here, because the proxy
 * is default-deny and `/` is not on the public allow-list. This exists for bookmarks and for anything
 * that still points at the root — including a confirmation link written before the landing moved.
 */
export default function Page() {
  redirect(AUTHENTICATED_HOME);
}
