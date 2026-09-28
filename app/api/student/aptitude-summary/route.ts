import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET /api/student/aptitude-summary -> { attempted, total } for the
// signed-in student's own aptitude practice, across every category.
// Counts only (head: true), so this stays cheap regardless of how big
// the aptitude bank grows — same posture as the DSA sheet needing the
// full bank, just without needing the actual rows here.
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const [{ count: total, error: totalError }, { count: attempted, error: attemptedError }] = await Promise.all([
    supabase.from("aptitude_questions").select("*", { count: "exact", head: true }),
    supabase.from("aptitude_practice_history").select("*", { count: "exact", head: true }).eq("student_id", user.id),
  ]);

  if (totalError) return NextResponse.json({ error: totalError.message }, { status: 500 });
  if (attemptedError) return NextResponse.json({ error: attemptedError.message }, { status: 500 });

  return NextResponse.json({ attempted: attempted ?? 0, total: total ?? 0 });
}
