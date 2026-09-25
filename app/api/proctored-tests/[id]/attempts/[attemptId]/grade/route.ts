import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization, isAuthorized } from "@/lib/classAccess";
import { getFlatQuestionsForTest } from "@/lib/proctoredSections";
import { recomputeTheoryScore } from "@/lib/proctoredScoring";
import type { UserRole } from "@/types";

async function loadAuthorizedAttempt(testId: string, attemptId: string, userId: string, role: UserRole) {
  const supabase = supabaseAdmin();
  const { data: test } = await supabase.from("proctored_tests").select("*").eq("id", testId).maybeSingle();
  if (!test) return { error: "Test not found." as const, status: 404 as const };

  const classAuth = await getClassAuthorization(test.class_id, userId, role);
  if (!isAuthorized(classAuth)) return { error: "Test not found." as const, status: 404 as const };

  const { data: attempt } = await supabase
    .from("proctored_test_attempts")
    .select("*, users(full_name, email)")
    .eq("id", attemptId)
    .eq("test_id", testId)
    .maybeSingle();
  if (!attempt) return { error: "Attempt not found." as const, status: 404 as const };

  return { test, attempt };
}

// GET /api/proctored-tests/[id]/attempts/[attemptId]/grade -> every
// theory question in the test, with this student's written answer and
// any marks already awarded — the data a teacher's grading panel needs.
// Teacher/admin only, same class-scoped authorization as every other
// teacher-facing proctored-tests route.
export async function GET(req: Request, { params }: { params: { id: string; attemptId: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await loadAuthorizedAttempt(params.id, params.attemptId, user.id, user.role);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { attempt } = result;

  if (attempt.status === "in_progress") {
    return NextResponse.json({ error: "This attempt hasn't been submitted yet." }, { status: 409 });
  }

  const questions = await getFlatQuestionsForTest(params.id);
  const theoryQuestions = questions.filter((q) => q.question_type === "theory");
  const theoryGrades = (attempt.theory_grades ?? {}) as Record<string, number>;

  return NextResponse.json({
    student_name: attempt.users?.full_name || attempt.users?.email || "Unknown",
    grading_status: attempt.grading_status,
    questions: theoryQuestions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      max_marks: q.max_marks,
      min_word_count: q.min_word_count,
      answer: (attempt.answers?.[q.id] as string | undefined) ?? "",
      marks_awarded: Object.prototype.hasOwnProperty.call(theoryGrades, q.id) ? theoryGrades[q.id] : null,
    })),
  });
}

// PATCH /api/proctored-tests/[id]/attempts/[attemptId]/grade
//   { question_id, marks_awarded: number | null }
// Awards (or clears, with null) marks for one theory answer, then
// re-derives the attempt's real score/grading_status from the full set
// of theory_grades (see recomputeTheoryScore) — never just adds the
// delta, so this stays correct even if a mark is edited more than once.
export async function PATCH(req: Request, { params }: { params: { id: string; attemptId: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { question_id, marks_awarded } = await req.json();
  if (!question_id) return NextResponse.json({ error: "question_id is required." }, { status: 400 });
  if (marks_awarded !== null && !Number.isFinite(Number(marks_awarded))) {
    return NextResponse.json({ error: "marks_awarded must be a number or null." }, { status: 400 });
  }

  const result = await loadAuthorizedAttempt(params.id, params.attemptId, user.id, user.role);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { attempt } = result;

  if (attempt.status === "in_progress") {
    return NextResponse.json({ error: "This attempt hasn't been submitted yet." }, { status: 409 });
  }

  const questions = await getFlatQuestionsForTest(params.id);
  const question = questions.find((q) => q.id === question_id && q.question_type === "theory");
  if (!question) return NextResponse.json({ error: "Theory question not found on this test." }, { status: 404 });

  const marks = marks_awarded === null ? null : Number(marks_awarded);
  if (marks !== null && (marks < 0 || marks > (question.max_marks ?? 0))) {
    return NextResponse.json({ error: `marks_awarded must be between 0 and ${question.max_marks}.` }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const nextGrades: Record<string, number> = { ...(attempt.theory_grades ?? {}) };
  if (marks === null) delete nextGrades[question_id];
  else nextGrades[question_id] = marks;

  const { error } = await supabase
    .from("proctored_test_attempts")
    .update({ theory_grades: nextGrades })
    .eq("id", attempt.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const recomputed = await recomputeTheoryScore(attempt.id, params.id);
  return NextResponse.json({ marks_awarded: marks, ...recomputed });
}
