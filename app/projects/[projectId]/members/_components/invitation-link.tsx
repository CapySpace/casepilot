"use client";

import { Check, Copy } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

/**
 * The link an Owner sends, shown once.
 *
 * The server hands over a *path*: its only idea of its own address is a Host header the caller writes,
 * and `app/auth/confirm/route.ts` explains why nothing here trusts that. The browser knows its origin
 * for certain, so the absolute URL is assembled on this side.
 *
 * It is an anchor as well as a string, which is what keeps it usable with no JavaScript: the href
 * resolves against the current page, so "copy link address" yields the whole URL even if this component
 * never gets to run. When it does run, the text becomes the URL itself — the thing the Owner is about to
 * paste into a message.
 */
/** The origin never changes while a page is open, so there is nothing to subscribe to. */
const NEVER_CHANGES = () => () => {};
const originInBrowser = () => window.location.origin;
const noOriginOnServer = () => null;

export function InvitationLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  // The sanctioned way to read something only the browser knows: React renders the server snapshot
  // during hydration and swaps in the client's afterwards, so the two never disagree. An effect that
  // set state would do the same job while lying about being a subscription.
  const origin = useSyncExternalStore(NEVER_CHANGES, originInBrowser, noOriginOnServer);

  const url = origin === null ? path : `${origin}${path}`;

  return (
    <div className="flex flex-wrap items-center gap-xs">
      <a
        href={path}
        className="min-w-0 flex-1 truncate rounded-lg bg-secondary px-2.5 py-2 font-mono text-body-sm text-reference"
      >
        {url}
      </a>

      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            // A refused clipboard is not a failure worth a message: the link is on screen, selectable,
            // and the anchor beside it can be copied the way any link is.
            setCopied(false);
          }
        }}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
