import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { InterviewQuestion } from "@/types";

// GET    /api/interview-prep/questions?categorySlug=cpp -> every question
//         in that category, with the author's name resolved. Any
//         signed-in role can read (students see the Q&A directly —
//         there's no "hidden answer" concept here like aptitude MCQs).
// POST   /api/interview-prep/questions { category_id, question, answer, difficulty? }
//         -> teacher/admin only.
// PATCH  /api/interview-prep/questions { id, ...fields } -> teacher/admin only.
// DELETE /api/interview-prep/questions { id } -> teacher/admin only.
export async function GET(req: Request) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categorySlug = searchParams.get("categorySlug");
  const categoryId = searchParams.get("categoryId");

  const supabase = supabaseAdmin();

  let resolvedCategoryId = categoryId;
  if (!resolvedCategoryId && categorySlug) {
    const { data: category } = await supabase
      .from("interview_categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (!category) return NextResponse.json({ questions: [] });
    resolvedCategoryId = category.id;
  }

  let query = supabase
    .from("interview_questions")
    .select("*, users(full_name, email)")
    .order("created_at", { ascending: false });
  if (resolvedCategoryId) query = query.eq("category_id", resolvedCategoryId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const questions: InterviewQuestion[] = (data ?? []).map((q: any) => ({
    id: q.id,
    category_id: q.category_id,
    question: q.question,
    answer: q.answer,
    difficulty: q.difficulty,
    created_by: q.created_by,
    created_by_name: q.users?.full_name || q.users?.email || null,
    created_at: q.created_at,
  }));

  return NextResponse.json({ questions });
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { category_id, question, answer, difficulty } = await req.json();
  if (!category_id || !question?.trim() || !answer?.trim()) {
    return NextResponse.json({ error: "category_id, question, and answer are required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("interview_questions")
    .insert({
      category_id,
      question: question.trim(),
      answer: answer.trim(),
      difficulty: difficulty || "unknown",
      created_by: user.id,
    })
    .select("*, users(full_name, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const created: InterviewQuestion = {
    id: data.id,
    category_id: data.category_id,
    question: data.question,
    answer: data.answer,
    difficulty: data.difficulty,
    created_by: data.created_by,
    created_by_name: data.users?.full_name || data.users?.email || null,
    created_at: data.created_at,
  };

  return NextResponse.json({ question: created }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, category_id, question, answer, difficulty } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("interview_questions")
    .update({
      ...(category_id ? { category_id } : {}),
      ...(question?.trim() ? { question: question.trim() } : {}),
      ...(answer?.trim() ? { answer: answer.trim() } : {}),
      ...(difficulty ? { difficulty } : {}),
    })
    .eq("id", id)
    .select("*, users(full_name, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const updated: InterviewQuestion = {
    id: data.id,
    category_id: data.category_id,
    question: data.question,
    answer: data.answer,
    difficulty: data.difficulty,
    created_by: data.created_by,
    created_by_name: data.users?.full_name || data.users?.email || null,
    created_at: data.created_at,
  };

  return NextResponse.json({ question: updated });
}

export async function DELETE(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("interview_questions").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
