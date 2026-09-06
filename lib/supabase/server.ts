import { createClient } from "@supabase/supabase-js";

// Server-only client. Uses the service role key, which bypasses RLS,
// so this must NEVER be imported into client components — only into
// route handlers / server components where we've already checked the
// caller's Clerk auth + role ourselves.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
