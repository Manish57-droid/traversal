import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { remainingSeconds, finalizeAttempt } from "@/lib/proctoredScoring";

// PATCH /api/proctored-tests/[id]/attempts/[attemptId]
//   { question_id, selected_option?: number | string | null, visited?: boolean, marked_for_review?: boolean }
// Autosaves immediately on every Save & Next / Clear Response / Mark
// for Review / plain navigation — so a violation-triggered auto-submit
// (or a crashed tab) always reflects real saved state, never
// client-only state. `selected_option: number` sets an MCQ answer (the
// selected option's index); `selected_option: string` sets a theory
// answer (the student's written text — length-capped well past any
// reasonable ~150-word answer, just as a sanity bound); `selected_option:
// null` clears it (Clear Response — answered becomes false); omitting
// it leaves the existing answer untouched (e.g. a pure "mark for
// review" or "visited" ping). `visited`/`marked_for_review` merge into
// `question_status`, independent of the answer.
export async function PATCH(req: Request, { params }: { params: { id: string; attemptId: string } }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question_id, selected_option, visited, marked_for_review } = await req.json();
  if (!question_id) {
    return NextResponse.json({ error: "question_id is required." }, { status: 400 });
  }
  if (selected_option !== undefined && selected_option !== null) {
    const isValidMcqAnswer = Number.isInteger(selected_option);
    const isValidTheoryAnswer = typeof selected_option === "string" && selected_option.length <= 20000;
    if (!isValidMcqAnswer && !isValidTheoryAnswer) {
      return NextResponse.json({ error: "selected_option must be an integer, a string, or null." }, { status: 400 });
    }
  }

  const supabase = supabaseAdmin();
  const { data: attempt } = await supabase
    .from("proctored_test_attempts")
    .select("*")
    .eq("id", params.attemptId)
    .eq("test_id", params.id)
    .maybeSingle();

  if (!attempt || attempt.student_id !== user.id) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "This attempt is already finished.", status: attempt.status }, { status: 409 });
  }

  const { data: test } = await supabase.from("proctored_tests").select("*").eq("id", params.id).single();
  // The combined-timer deadline is the hard ceiling only in "combined"
  // mode — in "per_section" mode, time is enforced per section (see
  // the sections/[sectionId] endpoint and the take screen's own
  // per-section countdown), so the attempt-level time_limit_minutes
  // (just a fallback value in that mode) shouldn't independently block
  // an otherwise-valid answer save.
  if (test.timer_mode !== "per_section") {
    const remaining = remainingSeconds(attempt.started_at, test.time_limit_minutes);
    if (remaining <= 0) {
      const result = await finalizeAttempt(attempt, test);
      return NextResponse.json(
        { error: "Time's up — this test was auto-submitted.", ...result },
        { status: 409 }
      );
    }
  }

  const nextAnswers = { ...attempt.answers };
  if (selected_option === null) {
    delete nextAnswers[question_id];
  } else if (selected_option !== undefined) {
    nextAnswers[question_id] = selected_option;
  }

  const nextStatus = { ...attempt.question_status };
  if (visited !== undefined || marked_for_review !== undefined) {
    const current = nextStatus[question_id] ?? { visited: false, marked_for_review: false };
    nextStatus[question_id] = {
      visited: visited !== undefined ? !!visited : current.visited,
      marked_for_review: marked_for_review !== undefined ? !!marked_for_review : current.marked_for_review,
    };
  }

  const { error } = await supabase
    .from("proctored_test_attempts")
    .update({ answers: nextAnswers, question_status: nextStatus })
    .eq("id", attempt.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
