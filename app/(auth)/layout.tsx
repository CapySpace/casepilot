import { Lock } from "lucide-react";
import Link from "next/link";

import { Wordmark } from "@/components/wordmark";

/**
 * The frame the authentication screens share: wordmark above, trust statement and copyright below,
 * the screen's own card in the middle.
 *
 * Two things the designs draw are deliberately not here:
 *
 * - SOC-2 and HIPAA trust badges, which sat beside the encryption statement. Removed until they can
 *   be substantiated: CasePilot should make no compliance claim it cannot back. The
 *   transport-security statement stays, because that one is simply true.
 * - A "Help & Support" link in the header. Its destination is out of scope for Phase 1.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="w-full">
        <div className="mx-auto flex h-20 max-w-shell items-center px-md">
          <Link href="/" className="rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Wordmark />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-md py-md sm:py-xl">
        <div className="flex w-full max-w-auth-card flex-col items-center gap-lg">
          {children}

          <p className="flex items-center gap-xs text-body-sm text-muted-foreground">
            <Lock className="size-3.5" aria-hidden="true" />
            256-bit TLS encryption
          </p>
        </div>
      </main>

      <footer className="px-md py-md text-center text-body-sm text-muted-foreground">
        <div className="mx-auto flex max-w-shell flex-col items-center justify-center gap-y-xs sm:flex-row sm:gap-x-lg">
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <span className="hidden text-border sm:inline" aria-hidden="true">
            •
          </span>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms of Service
          </Link>
          <span className="hidden text-border sm:inline" aria-hidden="true">
            •
          </span>
          <span>© {new Date().getFullYear()} CasePilot Technologies Inc.</span>
        </div>
      </footer>
    </div>
  );
}
