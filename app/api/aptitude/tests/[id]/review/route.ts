import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET /api/aptitude/tests/[id]/review -> full per-question right/wrong
// + explanation for the signed-in student's own attempt. Gated on the
// attempt being finished and the teacher having released results for
// this test — same mechanism as Proctored Tests' review endpoint.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();
  const { data: test } = await supabase.from("aptitude_tests").select("*").eq("id", params.id).maybeSingle();
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  if (!test.results_released) {
    return NextResponse.json({ error: "Results haven't been released yet." }, { status: 403 });
  }

  const { data: attempt } = await supabase
    .from("aptitude_test_attempts")
    .select("*")
    .eq("test_id", params.id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!attempt || attempt.status === "in_progress") {
    return NextResponse.json({ error: "No completed attempt found." }, { status: 404 });
  }

  const { data: testQuestions } = await supabase
    .from("aptitude_test_questions")
    .select("position, aptitude_questions(id, prompt, options, correct_option, explanation)")
    .eq("test_id", params.id)
    .order("position", { ascending: true });

  const questions = (testQuestions ?? [])
    .map((row: any) => row.aptitude_questions)
    .filter(Boolean)
    .map((q: any) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      correct_option: q.correct_option,
      explanation: q.explanation,
      selected_option: attempt.answers?.[q.id] ?? null,
    }));

  return NextResponse.json({
    questions,
    score: attempt.score,
    total_questions: attempt.total_questions,
    status: attempt.status,
  });
}
