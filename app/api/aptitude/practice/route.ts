import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET  /api/aptitude/practice?category=&topic=  -> every question in that
//        topic, joined with the signed-in student's own practice history
//        (if any), for the client to pick the next question from.
// POST /api/aptitude/practice { question_id, selected_option }
//        -> grade the answer against aptitude_questions.correct_option,
//           upsert aptitude_practice_history for (student, question),
//           and return whether it was correct + the explanation.
export async function GET(req: Request) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const topic = searchParams.get("topic");

  if (!category || !topic) {
    return NextResponse.json({ error: "category and topic are required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: questions, error } = await supabase
    .from("aptitude_questions")
    .select("id, category, topic, prompt, options, difficulty")
    .eq("category", category)
    .eq("topic", topic);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (questions ?? []).map((q) => q.id);
  const { data: history } = ids.length
    ? await supabase
        .from("aptitude_practice_history")
        .select("question_id, attempts_count, last_correct, last_attempted_at")
        .eq("student_id", user.id)
        .in("question_id", ids)
    : { data: [] };

  return NextResponse.json({ questions: questions ?? [], history: history ?? [] });
}

export async function POST(req: Request) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question_id, selected_option } = await req.json();
  if (!question_id || !Number.isInteger(selected_option)) {
    return NextResponse.json({ error: "question_id and selected_option are required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: question, error: qError } = await supabase
    .from("aptitude_questions")
    .select("correct_option, explanation")
    .eq("id", question_id)
    .single();

  if (qError || !question) {
    return NextResponse.json({ error: qError?.message ?? "Question not found." }, { status: 404 });
  }

  const isCorrect = selected_option === question.correct_option;
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("aptitude_practice_history")
    .select("attempts_count, first_correct_at")
    .eq("student_id", user.id)
    .eq("question_id", question_id)
    .maybeSingle();

  const { error: upsertError } = await supabase.from("aptitude_practice_history").upsert(
    {
      student_id: user.id,
      question_id,
      attempts_count: (existing?.attempts_count ?? 0) + 1,
      last_selected_option: selected_option,
      last_correct: isCorrect,
      last_attempted_at: now,
      first_correct_at: existing?.first_correct_at ?? (isCorrect ? now : null),
      updated_at: now,
    },
    { onConflict: "student_id,question_id" }
  );

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  return NextResponse.json({
    correct: isCorrect,
    correct_option: question.correct_option,
    explanation: question.explanation,
  });
}
