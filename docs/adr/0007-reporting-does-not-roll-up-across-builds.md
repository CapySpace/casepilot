# Reporting does not roll up across Builds

Since Cases belong to one Build and don't carry forward (ADR-0005), two Builds under the same
Release can have entirely unrelated sets of Cases. Summing their counts into one Release- or
Project-level total would blend two unrelated populations into a number that looks meaningful but
isn't. Release Summary and Project Dashboard therefore show a per-Build breakdown (most recent
called out as current), never a combined total, and every detail view (Failure Overview, Tester
Activity) stays scoped to one selected Build.

The alternative — a blended total — is not ruled out forever, but it would need its own answer to
"what does a Case's identity mean across Builds," which Build-scoping deliberately doesn't provide
yet.
