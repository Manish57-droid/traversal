import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { remainingSeconds } from "@/lib/testTiming";
import { finalizeAptitudeAttempt } from "@/lib/aptitudeScoring";

// PATCH /api/aptitude/tests/[id]/attempts/[attemptId] { question_id, selected_option }
// Autosaves one answer into the attempt's `answers` jsonb immediately
// on selection — matches Proctored Tests' pattern, so a timeout still
// scores real saved answers, never client-only state.
export async function PATCH(req: Request, { params }: { params: { id: string; attemptId: string } }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question_id, selected_option } = await req.json();
  if (!question_id || !Number.isInteger(selected_option)) {
    return NextResponse.json({ error: "question_id and selected_option are required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: attempt } = await supabase
    .from("aptitude_test_attempts")
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

  const { data: test } = await supabase.from("aptitude_tests").select("*").eq("id", params.id).single();
  const remaining = remainingSeconds(attempt.started_at, test.time_limit_minutes);
  if (remaining <= 0) {
    const result = await finalizeAptitudeAttempt(attempt, test);
    return NextResponse.json(
      { error: "Time's up — this test was auto-submitted.", ...result },
      { status: 409 }
    );
  }

  const nextAnswers = { ...attempt.answers, [question_id]: selected_option };
  const { error } = await supabase
    .from("aptitude_test_attempts")
    .update({ answers: nextAnswers })
    .eq("id", attempt.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
