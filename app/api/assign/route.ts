import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// POST /api/assign { question_set_id, class_id, due_date? }
// Assigns an entire question set to every current member of a class,
// creating a "not_started" progress row for each (student, question)
// pair so the whole set shows up on each student's sheet immediately.
export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { question_set_id, class_id, due_date } = await req.json();
  if (!question_set_id || !class_id) {
    return NextResponse.json({ error: "question_set_id and class_id are required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  // Ownership check — without this, any signed-in teacher could assign
  // into a class they don't own (or assign a question set they didn't
  // build) just by knowing/guessing its id. Admin bypasses both.
  if (user.role !== "admin") {
    const [{ data: klass }, { data: set }] = await Promise.all([
      supabase.from("classes").select("id").eq("id", class_id).eq("teacher_id", user.id).maybeSingle(),
      supabase.from("question_sets").select("id").eq("id", question_set_id).eq("created_by", user.id).maybeSingle(),
    ]);
    if (!klass) return NextResponse.json({ error: "Class not found." }, { status: 404 });
    if (!set) return NextResponse.json({ error: "Question set not found." }, { status: 404 });
  }

  const { data: assignment, error: assignError } = await supabase
    .from("assignments")
    .insert({
      question_set_id,
      class_id,
      assigned_by: user.id,
      due_date: due_date || null,
    })
    .select()
    .single();

  if (assignError) return NextResponse.json({ error: assignError.message }, { status: 500 });

  const [{ data: items, error: itemsError }, { data: members, error: membersError }] =
    await Promise.all([
      supabase.from("question_set_items").select("question_id").eq("question_set_id", question_set_id),
      supabase.from("class_members").select("student_id").eq("class_id", class_id),
    ]);

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });
  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 });

  if (items?.length && members?.length) {
    const rows = members.flatMap((m) =>
      items.map((it) => ({
        student_id: m.student_id,
        question_id: it.question_id,
        status: "not_started" as const,
      }))
    );
    // upsert so re-assigning, or assigning overlapping sets, never wipes
    // progress a student already made
    await supabase.from("progress").upsert(rows, {
      onConflict: "student_id,question_id",
      ignoreDuplicates: true,
    });
  }

  return NextResponse.json({ assignment }, { status: 201 });
}
