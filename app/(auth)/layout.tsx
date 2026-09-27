import { Lock } from "lucide-react";
import Link from "next/link";

/**
 * The frame the authentication screens share: wordmark above, trust statement and copyright below,
 * the screen's own card in the middle.
 *
 * Four things the designs draw are deliberately not here:
 *
 * - SOC-2 and HIPAA trust badges, which sat beside the encryption statement. Removed until they can
 *   be substantiated: CasePilot should make no compliance claim it cannot back. The
 *   transport-security statement stays, because that one is simply true.
 * - A "Help & Support" link in the header. Its destination is out of scope for Phase 1.
 * - "Privacy Policy" and "Terms of Service" links in the footer. Neither page exists, and because
 *   authentication is default-deny a link to one would bounce a signed-out visitor back to
 *   sign-in — worse than no link. Ticket 04 needs both pages anyway, to record consent at
 *   registration; the links belong with them.
 * - A logo mark above the heading. The brand asset lives in the design project, not the repo, and
 *   inventing one here is not this ticket's job.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="w-full">
        <div className="mx-auto flex h-20 max-w-shell items-center px-md">
          <Link href="/" className="font-heading text-title-lg font-bold">
            CasePilot
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

      <footer className="px-md py-lg text-center text-body-sm text-muted-foreground">
        © {new Date().getFullYear()} CasePilot Technologies Inc.
      </footer>
    </div>
  );
}
