import { LogOut } from "lucide-react";

import { signOut } from "@/app/actions";
import { Button } from "@/components/ui/button";

/**
 * A plain form, so signing out works whether or not the client bundle has loaded — the property the
 * authentication phase established and the one control where it matters most, because somebody
 * stepping away from a borrowed machine cannot wait for JavaScript.
 */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary">
        <LogOut aria-hidden="true" />
        Sign out
      </Button>
    </form>
  );
}
