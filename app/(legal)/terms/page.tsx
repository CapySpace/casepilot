import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · CasePilot",
};

/**
 * PLACEHOLDER. Writing the Terms of Service is not an engineering task, and its content is explicitly
 * out of scope for Phase 1.
 *
 * The page exists because registration records that a User agreed to it, and an agreement to
 * something they cannot read is not worth recording. `TERMS_VERSION` in `lib/auth/terms.ts` is the
 * version stamped on every profile; bump it when real wording lands here.
 */
export default function Page() {
  return (
    <article className="flex flex-col gap-md">
      <h1 className="text-headline-lg">Terms of Service</h1>
      <p className="text-body-lg text-muted-foreground">
        The terms on which CasePilot is provided.
      </p>
      <p className="text-body-md text-muted-foreground">
        This page is a placeholder. The wording has not been written yet, and CasePilot is not in
        use by anybody outside its own development.
      </p>
    </article>
  );
}
