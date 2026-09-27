import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifySession } from "@/lib/auth/dal";

/**
 * TEMPORARY. The authenticated area is a deliberate placeholder for the whole of Phase 1.
 *
 * A Project is the tenant boundary that owns Cases, and Projects arrive in Phase 2, so there is
 * genuinely nothing else to show yet. What it does do is name whoever is signed in, which on a
 * shared machine is the difference between knowing and guessing whose session is active.
 *
 * Replace the body of this page when Projects exist. Keep the `verifySession()` call.
 */
export default async function Page() {
  const user = await verifySession();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-lg px-md py-xl">
      <h1 className="text-headline-lg">CasePilot</h1>

      <Card>
        <CardHeader>
          <CardTitle>You are signed in</CardTitle>
          <CardDescription>
            Signed in as <span className="font-mono text-foreground">{user.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-body-md text-muted-foreground">
          There is nothing here yet. Projects, Cases and builds arrive in Phase 2 — this page is a
          placeholder so that signing in has somewhere to land.
        </CardContent>
      </Card>
    </main>
  );
}
