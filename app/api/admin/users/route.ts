import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { passwordStrengthError } from "@/lib/passwordStrength";
import type { UserRole, UserStatus } from "@/types";

// GET   /api/admin/users -> list every user (role + approval status)
// POST  /api/admin/users { full_name, email, password, role } -> admin
//        creates a login directly (any role, including admin) — no
//        self-serve sign-up/approval flow. The account is approved
//        immediately and flagged force_password_change so the admin-
//        set password must be replaced on first sign-in (see
//        middleware.ts and /change-password).
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

const CREATABLE_ROLES: UserRole[] = ["student", "teacher", "admin"];

export async function POST(req: Request) {
  const admin = await requireRole(["admin"]).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { full_name, email, password, role } = await req.json();
  if (!full_name?.trim() || !email?.trim() || !password || !CREATABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: "full_name, email, password, and a valid role are required." }, { status: 400 });
  }
  const strengthError = passwordStrengthError(password);
  if (strengthError) return NextResponse.json({ error: strengthError }, { status: 400 });

  const supabase = supabaseAdmin();

  // handle_new_user (the on_auth_user_created trigger) fires on this
  // insert and creates the public.users row itself — it only ever
  // assigns 'teacher' or 'student' from requested_role (never 'admin'
  // from client-supplied metadata, by design, since that same trigger
  // path is reachable from the public sign-up form). The explicit
  // update right after is what actually applies the admin's chosen
  // role — including 'admin' — plus approval and the forced-change flag.
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name.trim(), requested_role: role === "teacher" ? "teacher" : "student" },
  });
  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });

  const { data: userRow, error: updateError } = await supabase
    .from("users")
    .update({ role, status: "approved", force_password_change: true })
    .eq("id", created.user.id)
    .select()
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ user: userRow }, { status: 201 });
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
