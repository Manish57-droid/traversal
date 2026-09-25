import { supabaseAdmin } from "@/lib/supabase/server";
import { remainingSeconds } from "@/lib/testTiming";
import { getSectionsWithQuestions, type SectionWithQuestions } from "@/lib/proctoredSections";
import type { ProctoredAttemptStatus, ProctoredGradingStatus } from "@/types";

// Re-exported so existing imports of `remainingSeconds` from this
// module keep working unchanged — the actual timer math now lives in
// lib/testTiming.ts, shared with Aptitude Test Mode.
export { remainingSeconds };

interface AttemptRow {
  id: string;
  test_id: string;
  status: ProctoredAttemptStatus;
  answers: Record<string, number | string>;
  violation_count: number;
  started_at: string;
}

interface TestRow {
  time_limit_minutes: number;
  negative_marking_fraction: number;
  max_violations_before_autosubmit: number;
}

/** MCQ net score across every section — 1 point correct, -fraction
 * wrong (that section's override, else the test's), 0 unanswered.
 * Theory questions never contribute here; their marks only ever come
 * from a teacher's grading (see recomputeTheoryScore below). */
function scoreMcqSections(sections: SectionWithQuestions[], answers: Record<string, number | string>, testFraction: number) {
  let netScore = 0;
  for (const section of sections) {
    const fraction = section.negative_marking_fraction ?? testFraction;
    for (const q of section.questions) {
      if (q.question_type !== "mcq") continue;
      const selected = answers?.[q.id];
      if (selected === undefined || selected === null) continue;
      netScore += selected === q.correct_option ? 1 : -fraction;
    }
  }
  return netScore;
}

function maxPossibleScore(sections: SectionWithQuestions[]) {
  let max = 0;
  for (const section of sections) {
    for (const q of section.questions) {
      max += q.question_type === "theory" ? q.max_marks ?? 0 : 1;
    }
  }
  return max;
}

function hasTheoryQuestions(sections: SectionWithQuestions[]) {
  return sections.some((s) => s.questions.some((q) => q.question_type === "theory"));
}

/**
 * The single place an attempt is ever scored and closed out. Called
 * from three places (timer expiry, violation threshold, manual
 * submit) — the status is always derived from the attempt's own
 * server-known state (violation_count vs threshold, elapsed time vs
 * limit), never from a client-supplied "reason". Idempotent: if the
 * attempt is already finalized, returns its existing result instead
 * of rescoring.
 *
 * When the test has theory questions, `score` at this point only
 * reflects the MCQ portion — theory marks are added later, once a
 * teacher grades them (see recomputeTheoryScore), and `grading_status`
 * starts at 'pending' so callers know the score isn't final yet.
 */
export async function finalizeAttempt(attempt: AttemptRow, test: TestRow) {
  const supabase = supabaseAdmin();

  if (attempt.status !== "in_progress") {
    return {
      status: attempt.status,
      score: null as number | null,
      max_score: null as number | null,
      total_questions: null as number | null,
      grading_status: "not_required" as ProctoredGradingStatus,
    };
  }

  // Sections are the unit of negative marking — each uses its own
  // override when set, else falls back to the test-level value, so a
  // section's questions are scored with that section's fraction
  // regardless of what other sections in the same test use.
  const sections = await getSectionsWithQuestions(attempt.test_id);
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const maxScore = maxPossibleScore(sections);
  const gradingStatus: ProctoredGradingStatus = hasTheoryQuestions(sections) ? "pending" : "not_required";

  const netScore = scoreMcqSections(sections, attempt.answers, test.negative_marking_fraction);
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
      max_score: maxScore,
      total_questions: totalQuestions,
      grading_status: gradingStatus,
      time_taken_seconds: timeTakenSeconds,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", attempt.id);

  if (error) throw new Error(error.message);

  return { status: finalStatus, score, max_score: maxScore, total_questions: totalQuestions, grading_status: gradingStatus };
}

/**
 * Re-derives `score`/`grading_status` for a finished attempt after a
 * teacher awards (or changes) marks on a theory answer — the only
 * place theory_grades ever gets folded into the attempt's real score.
 * `grading_status` becomes 'graded' only once every theory question in
 * the test has an entry in theory_grades (0 is a valid, deliberate
 * grade — presence in the map is what counts, not truthiness).
 */
export async function recomputeTheoryScore(attemptId: string, testId: string) {
  const supabase = supabaseAdmin();

  const { data: attempt } = await supabase
    .from("proctored_test_attempts")
    .select("answers, theory_grades")
    .eq("id", attemptId)
    .single();
  if (!attempt) throw new Error("Attempt not found.");

  const { data: test } = await supabase
    .from("proctored_tests")
    .select("negative_marking_fraction")
    .eq("id", testId)
    .single();
  if (!test) throw new Error("Test not found.");

  const sections = await getSectionsWithQuestions(testId);
  const theoryGrades = (attempt.theory_grades ?? {}) as Record<string, number>;

  const mcqScore = scoreMcqSections(sections, attempt.answers ?? {}, test.negative_marking_fraction);

  let theoryScore = 0;
  let allGraded = true;
  for (const section of sections) {
    for (const q of section.questions) {
      if (q.question_type !== "theory") continue;
      if (Object.prototype.hasOwnProperty.call(theoryGrades, q.id)) {
        theoryScore += theoryGrades[q.id];
      } else {
        allGraded = false;
      }
    }
  }

  const score = Math.round((mcqScore + theoryScore) * 100) / 100;
  const gradingStatus: ProctoredGradingStatus = allGraded ? "graded" : "pending";

  const { error } = await supabase
    .from("proctored_test_attempts")
    .update({ score, grading_status: gradingStatus })
    .eq("id", attemptId);

  if (error) throw new Error(error.message);

  return { score, grading_status: gradingStatus };
}
