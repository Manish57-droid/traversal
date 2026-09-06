import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { QuestionStatus } from "@/types";

// GET  /api/progress                  -> the signed-in student's own sheet
//        (questions they added or were assigned, with their status)
// POST /api/progress { question_id, status } -> update/checkmark a question
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("progress")
    .select("*, questions(*)")
    .eq("student_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ progress: data });
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
