import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTestLeaderboard } from "@/lib/leaderboard";
import type { StudentProctoredTestRow } from "@/types";

// GET /api/student/proctored-tests -> every proctored test in a class
// the signed-in student belongs to, with their own attempt status (or
// "not_started" if they've never begun one) — powers the student's
// Proctored Tests list page and the dashboard's "My Proctored Tests"
// history table. `rank` is only ever populated when the test's
// results_released is true — the server never computes/sends it
// otherwise (a leaderboard exposes *other* students' data, so this is
// gated like the review endpoint, not left to the UI to hide).
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();

  const { data: memberships } = await supabase.from("class_members").select("class_id").eq("student_id", user.id);
  const classIds = (memberships ?? []).map((m) => m.class_id);
  if (classIds.length === 0) return NextResponse.json({ tests: [] });

  const { data: tests, error } = await supabase
    .from("proctored_tests")
    .select("*, classes(name)")
    .in("class_id", classIds)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const testIds = (tests ?? []).map((t) => t.id);
  const { data: attempts } = testIds.length
    ? await supabase
        .from("proctored_test_attempts")
        .select("test_id, status, score, max_score, total_questions, grading_status, submitted_at")
        .eq("student_id", user.id)
        .in("test_id", testIds)
    : { data: [] };

  const attemptByTest = new Map((attempts ?? []).map((a) => [a.test_id, a]));

  // Rank only needs computing for tests that are both released and
  // actually scored for this student — everything else stays null.
  const releasedScoredTestIds = (tests ?? [])
    .filter((t) => t.results_released && attemptByTest.get(t.id)?.score !== null && attemptByTest.get(t.id)?.score !== undefined)
    .map((t) => t.id);

  const rankByTest = new Map<string, number | null>();
  await Promise.all(
    releasedScoredTestIds.map(async (testId) => {
      const board = await getTestLeaderboard(testId);
      const mine = board.find((r) => r.student_id === user.id);
      rankByTest.set(testId, mine?.rank ?? null);
    })
  );

  const shaped: StudentProctoredTestRow[] = (tests ?? []).map((t: any) => {
    const attempt = attemptByTest.get(t.id);
    const released = !!t.results_released;
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      class_name: t.classes?.name ?? "",
      time_limit_minutes: t.time_limit_minutes,
      results_released: released,
      attempt_status: attempt?.status ?? "not_started",
      score: released ? attempt?.score ?? null : null,
      max_score: released ? attempt?.max_score ?? null : null,
      total_questions: released ? attempt?.total_questions ?? null : null,
      grading_status: attempt?.grading_status ?? "not_required",
      submitted_at: attempt?.submitted_at ?? null,
      rank: released ? rankByTest.get(t.id) ?? null : null,
    };
  });

  return NextResponse.json({ tests: shaped });
}
