import { supabaseAdmin } from "@/lib/supabase/server";
import type { ProctoredLeaderboardRow } from "@/types";

// Shared ranking logic for Proctored Tests — the one place a test's
// attempts get ordered into a leaderboard, so the student dashboard's
// history/top-5 widget and the teacher's full leaderboard can never
// drift into disagreeing about who's ranked where.
//
// Only 'submitted' / 'auto_submitted_violation' / 'expired' attempts
// are ranked (all three carry a real, final `score` from
// finalizeAttempt — 'in_progress' never does). Order is score DESC,
// then submitted_at ASC as the tiebreaker — an actual `.order()` call
// against Postgres via PostgREST (a real SQL ORDER BY, index-usable),
// not a `.sort()` over an unsorted fetch, so this scales with attempt
// count rather than degrading as a class grows. Rank numbers are then
// assigned with a single O(n) pass over that already-sorted sequence —
// unavoidable labeling of a sorted list, not a second sort — using
// competition ranking (1, 1, 3, not 1, 2, 3): two rows share a rank
// only if BOTH score and submitted_at are identical (down to the
// stored timestamp's microsecond precision), which the ORDER BY
// itself can't distinguish either, so treating them as tied is the
// only consistent choice rather than picking an arbitrary winner.
export async function getTestLeaderboard(testId: string): Promise<ProctoredLeaderboardRow[]> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("proctored_test_attempts")
    .select("id, student_id, score, total_questions, time_taken_seconds, submitted_at, users(full_name, email)")
    .eq("test_id", testId)
    .in("status", ["submitted", "auto_submitted_violation", "expired"])
    .not("score", "is", null)
    .not("submitted_at", "is", null)
    .order("score", { ascending: false })
    .order("submitted_at", { ascending: true });

  if (error) throw new Error(error.message);

  let rank = 0;
  let lastScore: number | null = null;
  let lastSubmittedAt: string | null = null;

  return ((data ?? []) as any[]).map((row, i) => {
    if (row.score !== lastScore || row.submitted_at !== lastSubmittedAt) {
      rank = i + 1;
      lastScore = row.score;
      lastSubmittedAt = row.submitted_at;
    }
    return {
      rank,
      attempt_id: row.id,
      student_id: row.student_id,
      student_name: row.users?.full_name || row.users?.email || "Unknown",
      student_email: row.users?.email ?? "",
      score: row.score,
      total_questions: row.total_questions,
      time_taken_seconds: row.time_taken_seconds,
      submitted_at: row.submitted_at,
    };
  });
}
