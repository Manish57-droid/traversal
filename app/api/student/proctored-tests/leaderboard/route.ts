import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTestLeaderboard } from "@/lib/leaderboard";
import type { ProctoredLeaderboardWidget } from "@/types";

// GET /api/student/proctored-tests/leaderboard -> the dashboard's
// "Top 5" widget: picks the student's most recently completed AND
// released proctored test (by their own submitted_at, among tests in
// classes they belong to), then returns its top 5 ranked students plus
// the student's own row if they're outside the top 5. Hard-gated the
// same way as the review endpoint — a test that isn't results_released
// never reaches the ranking step at all, so there's nothing to leak
// even momentarily. Returns `test: null` (not an error) when no
// released-and-completed test exists yet.
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();

  const { data: memberships } = await supabase.from("class_members").select("class_id").eq("student_id", user.id);
  const classIds = (memberships ?? []).map((m) => m.class_id);
  if (classIds.length === 0) return NextResponse.json(emptyWidget());

  const { data: releasedTests } = await supabase
    .from("proctored_tests")
    .select("id, name, classes(name)")
    .in("class_id", classIds)
    .eq("results_released", true);

  const releasedIds = (releasedTests ?? []).map((t) => t.id);
  if (releasedIds.length === 0) return NextResponse.json(emptyWidget());

  const { data: myFinishedAttempts } = await supabase
    .from("proctored_test_attempts")
    .select("test_id, submitted_at")
    .eq("student_id", user.id)
    .in("test_id", releasedIds)
    .in("status", ["submitted", "auto_submitted_violation", "expired"])
    .not("score", "is", null)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1);

  const mostRecent = myFinishedAttempts?.[0];
  if (!mostRecent) return NextResponse.json(emptyWidget());

  const test = releasedTests!.find((t: any) => t.id === mostRecent.test_id)!;
  const board = await getTestLeaderboard(test.id);
  const top = board.slice(0, 5);
  const me = board.find((r) => r.student_id === user.id) ?? null;
  const meInTop = top.some((r) => r.student_id === user.id);

  const widget: ProctoredLeaderboardWidget = {
    test: { id: test.id, name: test.name, class_name: (test as any).classes?.name ?? "" },
    top,
    me: meInTop ? null : me,
    me_in_top: meInTop,
  };

  return NextResponse.json(widget);
}

function emptyWidget(): ProctoredLeaderboardWidget {
  return { test: null, top: [], me: null, me_in_top: false };
}
