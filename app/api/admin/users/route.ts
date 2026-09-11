import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { UserRole, UserStatus } from "@/types";

// GET   /api/admin/users -> list every user (role + approval status)
// PATCH /api/admin/users { id, role?, status? } -> change a user's role
//        and/or approve/reject their account. Admin only.
export async function GET() {
  const admin = await requireRole(["admin"]).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

const VALID_ROLES: UserRole[] = ["student", "teacher", "admin"];
const VALID_STATUSES: UserStatus[] = ["pending", "approved", "rejected"];

export async function PATCH(req: Request) {
  const admin = await requireRole(["admin"]).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, role, status } = await req.json();
  if (!id || (role && !VALID_ROLES.includes(role)) || (status && !VALID_STATUSES.includes(status))) {
    return NextResponse.json({ error: "id, and a valid role and/or status, are required." }, { status: 400 });
  }
  if (!role && !status) {
    return NextResponse.json({ error: "Provide a role and/or status to update." }, { status: 400 });
  }

  // Guard: this is a generic "update any user" endpoint, and the admin
  // themselves shows up as a normal row in the /admin/users table like
  // everyone else — nothing stopped a stray click on their own row's
  // role dropdown from silently demoting them, with no confirmation.
  // Self-role-change isn't an intentional feature anywhere in this
  // app, so block it outright rather than let a UI slip cause it again.
  if (role && id === admin.id) {
    return NextResponse.json({ error: "You can't change your own role." }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  // Fetch the current role first so we can log the actual before/after
  // — and so we only log when the role is genuinely changing, not on
  // every PATCH that happens to include a role matching what's already
  // there.
  let previousRole: UserRole | null = null;
  if (role) {
    const { data: existing } = await supabase.from("users").select("role").eq("id", id).maybeSingle();
    previousRole = existing?.role ?? null;
  }

  const { data, error } = await supabase
    .from("users")
    .update({
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (role && previousRole && previousRole !== role) {
    const { error: logError } = await supabase.from("role_change_log").insert({
      target_user_id: id,
      previous_role: previousRole,
      new_role: role,
      changed_by: admin.id,
    });
    // A failed audit-log insert shouldn't block the actual role change
    // (which already succeeded) — just surface it server-side.
    if (logError) console.error("role_change_log insert failed:", logError.message);
  }

  return NextResponse.json({ user: data });
}
