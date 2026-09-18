import { supabaseAdmin } from "@/lib/supabase/server";
import { remainingSeconds } from "@/lib/testTiming";
import type { AptitudeAttemptStatus } from "@/types";

interface AttemptRow {
  id: string;
  test_id: string;
  status: AptitudeAttemptStatus;
  answers: Record<string, number>;
  started_at: string;
}

interface TestRow {
  time_limit_minutes: number;
  negative_marking_fraction: number;
}

/**
 * The single place an Aptitude Test Mode attempt is ever scored and
 * closed out — mirrors lib/proctoredScoring.ts's finalizeAttempt, but
 * with no violation concept: status is derived purely from elapsed
 * time vs. the limit (in_progress -> submitted, or expired on
 * timeout), never from anything the client claims. Idempotent: if
 * already finalized, returns the existing result instead of rescoring.
 */
export async function finalizeAptitudeAttempt(attempt: AttemptRow, test: TestRow) {
  const supabase = supabaseAdmin();

  if (attempt.status !== "in_progress") {
    return { status: attempt.status, score: null as number | null, total_questions: null as number | null };
  }

  const { data: testQuestions } = await supabase
    .from("aptitude_test_questions")
    .select("question_id, aptitude_questions(correct_option)")
    .eq("test_id", attempt.test_id);

  const rows = (testQuestions ?? []) as unknown as { question_id: string; aptitude_questions: { correct_option: number } | null }[];
  const totalQuestions = rows.length;

  let correct = 0;
  let wrong = 0;
  for (const row of rows) {
    const selected = attempt.answers?.[row.question_id];
    if (selected === undefined || selected === null) continue;
    if (row.aptitude_questions && selected === row.aptitude_questions.correct_option) correct += 1;
    else wrong += 1;
  }

  const score = Math.round((correct - wrong * test.negative_marking_fraction) * 100) / 100;
  const remaining = remainingSeconds(attempt.started_at, test.time_limit_minutes);
  const timeTakenSeconds = Math.max(0, test.time_limit_minutes * 60 - remaining);

  const finalStatus: AptitudeAttemptStatus = remaining <= 0 ? "expired" : "submitted";

  const { error } = await supabase
    .from("aptitude_test_attempts")
    .update({
      status: finalStatus,
      score,
      total_questions: totalQuestions,
      time_taken_seconds: timeTakenSeconds,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", attempt.id);

  if (error) throw new Error(error.message);

  return { status: finalStatus, score, total_questions: totalQuestions };
}
