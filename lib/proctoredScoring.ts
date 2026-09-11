import { supabaseAdmin } from "@/lib/supabase/server";
import type { ProctoredAttemptStatus } from "@/types";

/** Seconds left in the attempt, floored at 0 — the one place this
 * math happens, so the timer is always computed from `started_at`
 * (server clock) rather than trusted from the client. */
export function remainingSeconds(startedAt: string, timeLimitMinutes: number): number {
  const deadline = new Date(startedAt).getTime() + timeLimitMinutes * 60_000;
  return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
}

interface AttemptRow {
  id: string;
  test_id: string;
  status: ProctoredAttemptStatus;
  answers: Record<string, number>;
  violation_count: number;
  started_at: string;
}

interface TestRow {
  time_limit_minutes: number;
  negative_marking_fraction: number;
  max_violations_before_autosubmit: number;
}

/**
 * The single place an attempt is ever scored and closed out. Called
 * from three places (timer expiry, violation threshold, manual
 * submit) — the status is always derived from the attempt's own
 * server-known state (violation_count vs threshold, elapsed time vs
 * limit), never from a client-supplied "reason". Idempotent: if the
 * attempt is already finalized, returns its existing result instead
 * of rescoring.
 */
export async function finalizeAttempt(attempt: AttemptRow, test: TestRow) {
  const supabase = supabaseAdmin();

  if (attempt.status !== "in_progress") {
    return { status: attempt.status, score: null as number | null, total_questions: null as number | null };
  }

  const { data: testQuestions } = await supabase
    .from("proctored_test_questions")
    .select("question_id, proctored_questions(correct_option)")
    .eq("test_id", attempt.test_id);

  const rows = (testQuestions ?? []) as unknown as { question_id: string; proctored_questions: { correct_option: number } | null }[];
  const totalQuestions = rows.length;

  let correct = 0;
  let wrong = 0;
  for (const row of rows) {
    const selected = attempt.answers?.[row.question_id];
    if (selected === undefined || selected === null) continue;
    if (row.proctored_questions && selected === row.proctored_questions.correct_option) correct += 1;
    else wrong += 1;
  }

  const score = Math.round((correct - wrong * test.negative_marking_fraction) * 100) / 100;
  const remaining = remainingSeconds(attempt.started_at, test.time_limit_minutes);
  const timeTakenSeconds = Math.max(0, test.time_limit_minutes * 60 - remaining);

  const finalStatus: ProctoredAttemptStatus =
    attempt.violation_count >= test.max_violations_before_autosubmit
      ? "auto_submitted_violation"
      : remaining <= 0
        ? "expired"
        : "submitted";

  const { error } = await supabase
    .from("proctored_test_attempts")
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
