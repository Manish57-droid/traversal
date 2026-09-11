import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { RoleChangeLogRow } from "@/types";

// GET /api/admin/role-log -> every role_change_log row, newest first,
// with target/actor names resolved. Admin only. Sorting/filtering by
// target happens client-side — this is expected to stay small.
export async function GET() {
  const admin = await requireRole(["admin"]).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();

  // Two FKs to users on this table (target_user_id, changed_by) — the
  // explicit constraint-name hint is required or PostgREST can't
  // disambiguate which relationship to embed (PGRST201).
  const { data, error } = await supabase
    .from("role_change_log")
    .select(
      "id, target_user_id, previous_role, new_role, changed_by, changed_at, target:users!role_change_log_target_user_id_fkey(full_name, email), changed_by_user:users!role_change_log_changed_by_fkey(full_name, email)"
    )
    .order("changed_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: RoleChangeLogRow[] = (data ?? []).map((r: any) => ({
    id: r.id,
    target_user_id: r.target_user_id,
    target_name: r.target?.full_name || r.target?.email || "Unknown user",
    previous_role: r.previous_role,
    new_role: r.new_role,
    changed_by: r.changed_by,
    changed_by_name: r.changed_by_user?.full_name || r.changed_by_user?.email || "Unknown",
    changed_at: r.changed_at,
  }));

  return NextResponse.json({ rows });
}
