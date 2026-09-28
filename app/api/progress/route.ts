import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Question, QuestionStatus } from "@/types";

const SELECT_WITH_COMPANIES = "*, question_companies(frequency, companies(id, name))";

function mapQuestion(q: any): Question {
  return {
    ...q,
    companies: (q.question_companies ?? [])
      .filter((row: any) => row.companies)
      .map((row: any) => ({ id: row.companies.id, name: row.companies.name, frequency: row.frequency })),
  };
}

// GET  /api/progress -> the whole DSA bank for the signed-in student,
//        each question carrying their own status ("not_started" for
//        anything they haven't touched yet — no assignment or class
//        membership required, the bank itself is open to any student,
//        same as Aptitude practice already is). Left join done in JS:
//        every question comes back regardless of whether a progress
//        row exists for it yet.
// POST /api/progress { question_id, status } -> update/checkmark a
//        question — upserts on (student_id, question_id), so this
//        works identically whether or not a row already existed.
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const [{ data: questions, error: qError }, { data: progressRows, error: pError }] = await Promise.all([
    supabase.from("questions").select(SELECT_WITH_COMPANIES).order("created_at", { ascending: false }),
    supabase.from("progress").select("*").eq("student_id", user.id),
  ]);

  if (qError) return NextResponse.json({ error: qError.message }, { status: 500 });
  if (pError) return NextResponse.json({ error: pError.message }, { status: 500 });

  const progressByQuestion = new Map((progressRows ?? []).map((r) => [r.question_id, r]));

  const merged = (questions ?? []).map((q: any) => {
    const existing = progressByQuestion.get(q.id);
    return {
      question_id: q.id,
      status: (existing?.status ?? "not_started") as QuestionStatus,
      questions: mapQuestion(q),
    };
  });

  return NextResponse.json({ progress: merged });
}

const VALID_STATUSES: QuestionStatus[] = ["not_started", "attempted", "completed"];

export async function POST(req: Request) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question_id, status } = await req.json();

  if (!question_id || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "question_id and a valid status are required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("progress")
    .upsert(
      {
        student_id: user.id,
        question_id,
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,question_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ progress: data });
}
