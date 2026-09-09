import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET /api/admin/access-requests -> every pending class-access request
// across every class, so admin can see and act on them without having
// to open each class individually. Approve/reject still go through the
// existing per-class endpoints (admin passes their existing auth check
// there too).
export async function GET() {
  const admin = await requireRole(["admin"]).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("class_access_requests")
    // Same ambiguous-FK situation as classes/[id]/access-requests —
    // class_access_requests has two FKs to users, so this needs the
    // explicit constraint name.
    .select(
      "id, class_id, requesting_teacher_id, requested_at, classes(name), users!class_access_requests_requesting_teacher_id_fkey(full_name, email)"
    )
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const requests = (data ?? []).map((r: any) => ({
    id: r.id,
    class_id: r.class_id,
    class_name: r.classes?.name ?? "Unknown class",
    requesting_teacher_id: r.requesting_teacher_id,
    requested_at: r.requested_at,
    full_name: r.users?.full_name ?? null,
    email: r.users?.email ?? "",
  }));

  return NextResponse.json({ requests });
}
