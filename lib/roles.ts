import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server-client";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { AppUser, UserRole } from "@/types";

const TRUSTED_USER_HEADER = "x-verified-user-id";
const TRUSTED_PROFILE_HEADER = "x-verified-user-profile";

/**
 * Identity comes from Supabase Auth (the session cookie); role and
 * approval status live in the `users` table, populated automatically
 * at sign-up by the `handle_new_user` trigger (see schema.sql). This
 * looks up both in one round trip using the service-role client,
 * which bypasses RLS — the caller's identity was already verified via
 * the Auth session above.
 *
 * Performance note: `middleware.ts` already runs `supabase.auth.
 * getUser()` for every matched request (every page and every
 * `/api/**` route) and, on success, sets `x-verified-user-id` on the
 * request — a header only middleware can set (any client-supplied
 * value is stripped before middleware does its own check, so this
 * can't be spoofed; see middleware.ts). When that header is present
 * we trust it and skip re-verifying the same JWT via a second
 * `auth.getUser()` network round-trip here — that redundant
 * re-check, once per layout AND once per API route on top of
 * middleware's own check, was the main reason the app felt slow
 * everywhere (see changelog.md for the measured numbers). Middleware
 * also passes along the `users` row it already read for this same
 * request (`x-verified-user-profile`, equally unforgeable), so we
 * reuse that instead of querying it again. It's read fresh once per
 * request, so role/status changes still apply on the very next
 * request — nothing is cached across requests.
 * Falls back to a real `auth.getUser()` check when the header isn't
 * present (e.g. a public path middleware doesn't check auth for).
 */
export async function getCurrentAppUser(): Promise<AppUser | null> {
  const hdrs = await headers();
  let authUserId = hdrs.get(TRUSTED_USER_HEADER);

  const profileHeader = authUserId ? hdrs.get(TRUSTED_PROFILE_HEADER) : null;
  if (profileHeader) {
    try {
      const profile = JSON.parse(decodeURIComponent(profileHeader)) as AppUser;
      if (profile.id === authUserId) return profile;
    } catch {
      // Malformed — fall through to the DB lookup below.
    }
  }

  if (!authUserId) {
    const supabase = await supabaseServer();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    authUserId = authUser?.id ?? null;
  }

  if (!authUserId) return null;

  const admin = supabaseAdmin();
  const { data } = await admin.from("users").select("*").eq("id", authUserId).single();

  return (data as AppUser) ?? null;
}

export async function requireRole(allowed: UserRole[]): Promise<AppUser> {
  const user = await getCurrentAppUser();
  if (!user || user.status !== "approved" || !allowed.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}
