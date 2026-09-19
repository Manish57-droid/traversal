import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getFlatQuestionsForTest } from "@/lib/proctoredSections";

// GET /api/proctored-tests/[id]/review -> full per-question right/
// wrong + explanation for the signed-in student's own attempt.
// Gated on two things: the attempt must actually be finished, and the
// teacher must have explicitly released results for this test
// (`results_released`) — before that, this always 403s regardless of
// how long ago the student submitted.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();
  const { data: test } = await supabase.from("proctored_tests").select("*").eq("id", params.id).maybeSingle();
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  if (!test.results_released) {
    return NextResponse.json({ error: "Results haven't been released yet." }, { status: 403 });
  }

  const { data: attempt } = await supabase
    .from("proctored_test_attempts")
    .select("*")
    .eq("test_id", params.id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!attempt || attempt.status === "in_progress") {
    return NextResponse.json({ error: "No completed attempt found." }, { status: 404 });
  }

  const resolvedQuestions = await getFlatQuestionsForTest(params.id);

  const questions = resolvedQuestions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: q.options,
    correct_option: q.correct_option,
    explanation: q.explanation,
    selected_option: attempt.answers?.[q.id] ?? null,
    image_url: q.image_url ?? null,
    section_id: q.section_id,
    section_name: q.section_name,
  }));

  return NextResponse.json({
    questions,
    score: attempt.score,
    total_questions: attempt.total_questions,
    status: attempt.status,
  });
}
