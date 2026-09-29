# 03: Case Details, editing and deletion

**What to build:** Opening a Case shows its complete definition, steps included, with Edit and Delete
available to any Member. Edit reuses the Create form from ticket 02, pre-filled. Delete asks for
confirmation before the Case disappears.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] Opening a Case shows its title, description, preconditions, steps in order (each with its expected
      result if one was given), overall expected result, priority, status, code, and who created and
      last updated it, and when
- [x] The URL names the Project, Release, Build and Case
- [x] An Edit action opens the same form used for creation, pre-filled with the Case's current values
      including its steps, and supports adding, removing and reordering steps
- [x] Saving an edit updates the Case immediately, visible to other Members on their next load — no
      conflict warning if two Members edited around the same time, last save wins
- [x] Any Member — not only the Case's creator — can edit or delete it
- [x] A Delete action asks for confirmation before the Case is removed from the list and its Details page
      stops being reachable
- [x] A deleted Case's code is never reused by a later Case in the same Build
- [x] A signed-in non-member opening a Case's URL gets a 404
- [x] A Case reached by its own id under the wrong Build is treated as not found
- [x] Browser tests cover viewing Details, editing every field including steps, deleting with
      confirmation, and the non-member and wrong-Build 404s
