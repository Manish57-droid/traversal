import { supabaseServer } from "@/lib/supabase/server-client";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { AppUser, UserRole } from "@/types";

/**
 * Identity comes from Supabase Auth (the session cookie); role and
 * approval status live in the `users` table, populated automatically
 * at sign-up by the `handle_new_user` trigger (see schema.sql). This
 * looks up both in one round trip using the service-role client,
 * which bypasses RLS — the caller's identity was already verified via
 * the Auth session above.
 */
export async function getCurrentAppUser(): Promise<AppUser | null> {
  const supabase = await supabaseServer();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const admin = supabaseAdmin();
  const { data } = await admin.from("users").select("*").eq("id", authUser.id).single();

  return (data as AppUser) ?? null;
}

export async function requireRole(allowed: UserRole[]): Promise<AppUser> {
  const user = await getCurrentAppUser();
  if (!user || user.status !== "approved" || !allowed.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}
