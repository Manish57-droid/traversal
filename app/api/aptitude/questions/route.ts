import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { AptitudeCategory } from "@/types";

const VALID_CATEGORIES: AptitudeCategory[] = ["quant", "logical", "verbal"];

// GET    /api/aptitude/questions?category=&topic=  -> list questions,
//         optionally filtered. Any signed-in role can read (students
//         hit this indirectly via /api/aptitude/practice; teachers
//         read it directly to manage the bank).
// POST   /api/aptitude/questions  -> add a question. Teacher/admin only.
// PATCH  /api/aptitude/questions { id, ...fields }  -> edit a question.
// DELETE /api/aptitude/questions { id }  -> remove a question.
export async function GET(req: Request) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const topic = searchParams.get("topic");

  const supabase = supabaseAdmin();
  let query = supabase.from("aptitude_questions").select("*").order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (topic) query = query.eq("topic", topic);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ questions: data });
}

function validateOptions(options: unknown, correct_option: unknown) {
  if (!Array.isArray(options) || options.length < 2 || options.some((o) => !String(o ?? "").trim())) {
    return "At least 2 non-empty options are required.";
  }
  const idx = Number(correct_option);
  if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
    return "correct_option must be a valid index into options.";
  }
  return null;
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { category, topic, prompt, options, correct_option, explanation, difficulty } = body ?? {};

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "A valid category is required." }, { status: 400 });
  }
  if (!topic?.trim()) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }
  const optionsError = validateOptions(options, correct_option);
  if (optionsError) return NextResponse.json({ error: optionsError }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data: question, error } = await supabase
    .from("aptitude_questions")
    .insert({
      category,
      topic: topic.trim(),
      prompt: prompt.trim(),
      options: (options as string[]).map((o) => o.trim()),
      correct_option: Number(correct_option),
      explanation: explanation?.trim() || null,
      difficulty: difficulty || "unknown",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, category, topic, prompt, options, correct_option, explanation, difficulty } = body ?? {};

  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  if (category && !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  if (options !== undefined || correct_option !== undefined) {
    const optionsError = validateOptions(options, correct_option);
    if (optionsError) return NextResponse.json({ error: optionsError }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: question, error } = await supabase
    .from("aptitude_questions")
    .update({
      ...(category ? { category } : {}),
      ...(topic?.trim() ? { topic: topic.trim() } : {}),
      ...(prompt?.trim() ? { prompt: prompt.trim() } : {}),
      ...(options ? { options: (options as string[]).map((o) => o.trim()) } : {}),
      ...(correct_option !== undefined ? { correct_option: Number(correct_option) } : {}),
      ...(explanation !== undefined ? { explanation: explanation?.trim() || null } : {}),
      ...(difficulty ? { difficulty } : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question });
}

export async function DELETE(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("aptitude_questions").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
