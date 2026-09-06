"use client";

import { createBrowserClient } from "@supabase/ssr";

// Client-side Supabase client, used only for Auth (sign up / sign in /
// sign out) in the browser. It uses the public anon key and the
// session cookie — never the service role key.
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
