import Link from "next/link";

/**
 * The frame for the Terms of Service and Privacy Policy.
 *
 * Both are reachable without a session, because registration links to them and nobody has one yet
 * at that point.
 */
export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="w-full">
        <div className="mx-auto flex h-20 max-w-reading items-center px-md">
          <Link href="/sign-in" className="font-heading text-title-lg font-bold">
            CasePilot
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-reading flex-1 px-md py-lg">{children}</main>
      <footer className="px-md py-lg text-center text-body-sm text-muted-foreground">
        © {new Date().getFullYear()} CasePilot Technologies Inc.
      </footer>
    </div>
  );
}
