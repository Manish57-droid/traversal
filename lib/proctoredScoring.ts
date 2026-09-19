import { supabaseAdmin } from "@/lib/supabase/server";
import { remainingSeconds } from "@/lib/testTiming";
import { getSectionsWithQuestions } from "@/lib/proctoredSections";
import type { ProctoredAttemptStatus } from "@/types";

// Re-exported so existing imports of `remainingSeconds` from this
// module keep working unchanged — the actual timer math now lives in
// lib/testTiming.ts, shared with Aptitude Test Mode.
export { remainingSeconds };

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

  // Sections are the unit of negative marking — each uses its own
  // override when set, else falls back to the test-level value, so a
  // section's questions are scored with that section's fraction
  // regardless of what other sections in the same test use.
  const sections = await getSectionsWithQuestions(attempt.test_id);
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);

  let netScore = 0;
  for (const section of sections) {
    const fraction = section.negative_marking_fraction ?? test.negative_marking_fraction;
    for (const q of section.questions) {
      const selected = attempt.answers?.[q.id];
      if (selected === undefined || selected === null) continue;
      netScore += selected === q.correct_option ? 1 : -fraction;
    }
  }

  const score = Math.round(netScore * 100) / 100;
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
