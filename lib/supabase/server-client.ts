import { cookies } from "next/headers";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";

// Server-side, session-aware Supabase client for Server Components and
// Route Handlers — reads the Auth cookie to answer "who is signed in?"
// via supabase.auth.getUser(). Uses the anon key; this is NOT the
// service-role client (see lib/supabase/server.ts) and can't read
// business data on its own thanks to RLS.
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptionsWithName }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't set cookies —
            // safe to ignore as long as middleware also refreshes the
            // session (it does, see middleware.ts).
          }
        },
      },
    }
  );
}
