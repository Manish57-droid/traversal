import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// PATCH /api/student/notifications/[id] { read: true } -> marks one of
// the signed-in student's own notifications read (or unread). Scoped
// to student_id = caller — the id path param alone isn't enough to
// touch someone else's row.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["student"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { read } = await req.json().catch(() => ({ read: true }));

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("notifications")
    .update({ read: read !== false })
    .eq("id", params.id)
    .eq("student_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}
