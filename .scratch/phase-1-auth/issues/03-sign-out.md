# 03: Sign out

**What to build:** A signed-in User signs out, lands back on the sign-in page, and cannot get back
into the application afterwards — including by pressing the back button or retyping a protected URL.

Small, but worth proving on its own: the point is that the session is genuinely removed rather than
merely hidden from the interface.

**Blocked by:** 02 (Sign in and the protected shell).

**Status:** ready-for-agent

- [x] A signed-in User can sign out from the authenticated area
- [x] Signing out removes the session rather than only clearing the interface
- [x] After signing out the User is returned to the sign-in page
- [x] After signing out, the back button does not return the User to authenticated content
- [x] After signing out, opening a protected URL directly redirects to sign-in
- [x] Browser tests cover the full round trip: sign in, sign out, and confirm protected content is unreachable
