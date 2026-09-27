"use client";

import { createBrowserClient } from "@supabase/ssr";

import { publicSupabaseEnv } from "./env";

/**
 * The Supabase client for browser context — Client Components and the live validation they run.
 *
 * Cookie handling is left to the library, which reads and writes `document.cookie` in batches. Never
 * hand this a custom single-cookie `get`/`set`/`remove` store: that form is deprecated and misses
 * edge cases that surface as random sign-outs.
 *
 * Authoritative checks do not belong here. Anything the browser claims about who it is can be
 * forged; the Data Access Layer is the boundary that decides (ADR-0002).
 */
export function createClient() {
  const { url, publishableKey } = publicSupabaseEnv();

  return createBrowserClient(url, publishableKey);
}
