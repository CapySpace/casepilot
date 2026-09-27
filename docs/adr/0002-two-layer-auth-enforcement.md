# Authentication is enforced in two layers, not one

Protected routes are guarded twice: `proxy.ts` performs a cheap, optimistic check on every request
so unauthenticated users are redirected before a protected page renders, and a Data Access Layer
(`verifySession()`) performs the authoritative check wherever data is actually read. Next.js's own
authentication guide is explicit that proxy-level checks "should not be your only line of defense",
because the proxy also runs on prefetches and cannot safely touch the database.

The two layers deliberately use different verification calls: the proxy uses `getClaims()`, which
verifies the JWT signature locally with no network round-trip, while the DAL uses `getUser()`, which
asks Supabase and therefore notices sessions revoked elsewhere. Fast where it must be cheap,
correct where it must be correct.

## Why this will look wrong at first glance

Every Supabase + Next.js guide in circulation shows a single `middleware.ts` gate, so a reader will
find two surprises here: the file is **`proxy.ts`** (the `middleware` convention is deprecated as of
Next.js 16 and renamed, functionality unchanged), and the DAL checks will look redundant beside it.
They are not. Deleting either one leaves a real hole: without the proxy, protected pages flash
before redirecting; without the DAL, any route that forgets its own check is unguarded.

The proxy is **default-deny** — it runs on all routes and redirects unless the path is on a public
allow-list. The alternative, protecting an explicit list of private paths, fails silently every time
someone adds a route and forgets. This way, forgetting locks you out instead.
