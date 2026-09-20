import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { StudentNotification } from "@/types";

const LIST_LIMIT = 30;

// GET /api/student/notifications -> the signed-in student's most
// recent notifications (newest first, capped at 30 — this is a
// dashboard feed, not a full history page) plus how many are unread.
export async function GET() {
  const user = await requireRole(["student"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();
  const [{ data, error }, { count: unreadCount }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("read", false),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    notifications: (data ?? []) as StudentNotification[],
    unread_count: unreadCount ?? 0,
  });
}
