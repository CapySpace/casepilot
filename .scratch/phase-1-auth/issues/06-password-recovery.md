# 06: Password recovery

**What to build:** A User who has forgotten their password enters their email address, receives a
link, chooses a new password, and signs in with it.

Deliberately one ticket rather than two. A "request a reset link" slice on its own delivers an email
whose link goes nowhere, which is not a tracer bullet — the User's journey only completes when the
new password works.

The request form must not disclose account existence: the same confirmation appears whether or not
the address is registered, for the same reason registration does not disclose it. The confirmation
endpoint built in ticket 05 is extended to handle recovery tokens and route onward to the
choose-a-new-password form, rather than a second endpoint being added.

Unlike registration, choosing a new password does require confirming it — the User is typing a
password they have not used before and cannot verify against memory.

**Blocked by:** 05 (Email verification).

**Status:** ready-for-agent

- [ ] A User can request a reset link using only their email address
- [ ] The same confirmation message appears whether or not the address is registered
- [ ] The reset link arrives by email, so only someone with inbox access can change the password
- [ ] Following the link takes the User straight to a form for choosing a new password
- [ ] The new-password form applies the same rule and the same live feedback as registration
- [ ] The new password must be confirmed, so a typo cannot lock the User out
- [ ] An invalid reset link is rejected with a plain-language explanation
- [ ] An expired reset link is rejected with a plain-language explanation
- [ ] A used or tampered reset link cannot be replayed by anyone who intercepts the email
- [ ] After resetting, the User can immediately sign in with the new password
- [ ] The old password no longer works
- [ ] There is a route back to sign-in from the request form, so recovery is not a dead end
- [ ] Browser tests cover the full recovery journey plus the invalid and expired link cases
