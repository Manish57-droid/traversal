import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// POST /api/student/notifications/read-all -> marks every unread
// notification belonging to the signed-in student as read.
export async function POST() {
  const user = await requireRole(["student"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("student_id", user.id)
    .eq("read", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}
