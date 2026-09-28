# Stitch design snapshot

What the Stitch project looked like at the last sync: the HTML each screen generates, a screenshot of
it, and `metadata.json` recording which screen is which and where it came from.

**It is a record, not a source of truth.** `DESIGN.md` and `app/globals.css` decide how this product
looks; these files are the reference those decisions were taken against. Where the two disagree, the
disagreement is the point — read the reasoning in `DESIGN.md` before changing anything to match a
screen here.

## Why it is committed

A Stitch screen is regenerated in place. The same screen id returned three different documents in one
afternoon, each dropping invented data the product does not have — first the test-case counts and the
last-run status, then the project key chip. Without a stored copy there is nothing to diff against, so
"has the design changed?" can only be answered by looking at a picture and remembering. The `htmlSha256`
in `metadata.json` answers it in one command.

Note that the download URLs are minted per request: a changed file id does **not** mean the design
changed. Diff the content.

## Refreshing

The `stitch-build:react-components` skill drives this: it lists the screens over MCP, downloads each
one, and rewrites `metadata.json`. Its later phases generate a Vite/React-Router component tree, which
this repository is not — see the skill's invocation notes in the session history for what was
deliberately not run.
