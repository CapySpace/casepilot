# Invitations are links the Owner sends, bound to the address they name

CasePilot cannot send email that is not an authentication email: there is no mail library, no SMTP
configured, and the secret key is quarantined to the test suite. So an Invitation is recorded in the
database and the Owner is handed a single-use link to send by whatever means they already have. The
Invitation is still *addressed*: acceptance requires the signed-in User's email to match the
Invitation's, compared case-insensitively, so the link being forwarded achieves nothing. Only a
SHA-256 hash of the token is stored, and acceptance runs inside one `security definer` transaction,
so a token cannot be replayed and cannot be accepted twice by two simultaneous clicks.

## Considered Options

- **Supabase's admin invite API** (`inviteUserByEmail`) would have sent real mail. It needs the
  secret key in the application runtime, which `tests/unit/secret-key-containment.test.ts` forbids
  and ADR-0001 contains on purpose — and it inserts into `auth.users` with no `full_name`, which the
  profile trigger rejects with an opaque `unexpected_failure`. ADR-0001 predicted exactly this for
  "any future invite path". Not a wrinkle: a hard failure.
- **A transactional mail provider** (Resend, or the commented-out `[auth.email.smtp]` block) is the
  right answer eventually, and is additive — one call beside the insert, plus a secret, a template
  and a delivery seam for the tests. It was not worth blocking the phase on.
- **An unaddressed join link** — whoever holds it and is signed in joins — is how most invite links
  behave, and would rescue the colleague whose CasePilot account uses a different address from the
  one the Owner knew. Rejected because it quietly converts an Invitation into a join code: the Owner
  who invited `anna@company.com` would have no way to know a contractor used the link instead, and
  "invitation tokens cannot be reused" becomes meaningless when the token is not tied to anybody.

## Consequences

- **The flow in the brief has a human step in the middle.** "User Receives Invitation" is the
  Owner's job — Slack, their own mail client, a conversation. The interface says so plainly rather
  than implying mail is on its way.
- **A wrong-address mismatch is a real friction**, and it is one message away from resolved: the
  acceptance page names the address the Invitation was sent to and the address the User is signed in
  as, and offers a way to sign out. The Owner can cancel and re-invite.
- **Expiry is derived from `expires_at`, never stored**, so there is no sweep to run and no row that
  says `pending` while being expired. The cost is that the partial unique index cannot express "one
  *live* Invitation per address" — an index predicate may not call `now()` — so the action cancels a
  stale pending row before issuing a fresh one.
- **Adding mail later changes no data model.** The Invitation already carries the address, the token
  hash, the expiry and the inviter. Delivery is a call beside the insert, and the copyable link can
  stay for the cases where mail does not arrive.
