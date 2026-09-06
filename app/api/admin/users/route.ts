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

  const supabase = supabaseAdmin();
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
  return NextResponse.json({ user: data });
}
