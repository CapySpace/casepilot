import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Temporary. Ticket 02 replaces this with the authenticated shell behind the default-deny proxy.
 *
 * It exists so the browser test runner has a page to load, and so the design system's tokens are
 * visibly wired to the component library before any real form is built on them.
 */
export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-lg px-md py-xl">
      <h1 className="text-headline-lg">CasePilot</h1>
      <p className="max-w-prose text-muted-foreground">
        Test-execution tracking for software QA teams: what was tested, against which build, by whom,
        and what happened — with a history that can be audited rather than overwritten.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Phase 1 — Authentication</CardTitle>
          <CardDescription>
            Foundations only. There is nothing to sign in to yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Registration, sign-in, verification and password recovery arrive in the tickets that follow
          this one. See <code>.scratch/phase-1-auth/spec.md</code>.
        </CardContent>
      </Card>
    </main>
  );
}
