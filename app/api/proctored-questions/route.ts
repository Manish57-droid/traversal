import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ProctoredQuestion } from "@/types";

// GET    /api/proctored-questions?setId=...&subjectId=...&needsCategorization=true
//         -> list every question in the bank, with the author's name
//         and its set/subject resolved. Any signed-in role can read
//         (teachers/admins manage the bank directly; students never
//         see this bank outside of an actual test attempt, which the
//         follow-up test-taking task will scope separately). Filters
//         are optional and combinable; needsCategorization=true finds
//         legacy/unassigned questions regardless of subject/set filters.
// POST   /api/proctored-questions { prompt, options, correct_option, set_id, explanation?, difficulty? }
//         -> teacher/admin only. set_id is required for new questions.
// PATCH  /api/proctored-questions { id, ...fields } -> teacher/admin only.
//         set_id: null explicitly un-assigns and flags needs_categorization.
// DELETE /api/proctored-questions { id } -> teacher/admin only.
function mapQuestion(q: any): ProctoredQuestion {
  return {
    id: q.id,
    prompt: q.prompt,
    options: q.options,
    correct_option: q.correct_option,
    explanation: q.explanation,
    difficulty: q.difficulty,
    created_by: q.created_by,
    created_by_name: q.users?.full_name || q.users?.email || null,
    created_at: q.created_at,
    image_url: q.image_url ?? null,
    set_id: q.set_id ?? null,
    set_name: q.proctored_sets?.name ?? null,
    subject_id: q.proctored_sets?.subject_id ?? null,
    subject_name: q.proctored_sets?.proctored_subjects?.name ?? null,
    needs_categorization: q.needs_categorization,
  };
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

const SELECT_WITH_JOINS = "*, users(full_name, email), proctored_sets(name, subject_id, proctored_subjects(name))";

export async function GET(req: Request) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const setId = searchParams.get("setId");
  const subjectId = searchParams.get("subjectId");
  const needsCategorization = searchParams.get("needsCategorization");

  const supabase = supabaseAdmin();
  let query = supabase.from("proctored_questions").select(SELECT_WITH_JOINS).order("created_at", { ascending: false });

  if (needsCategorization === "true") {
    query = query.eq("needs_categorization", true);
  } else if (setId) {
    query = query.eq("set_id", setId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let mapped = (data ?? []).map(mapQuestion);
  // Filtered in JS rather than via a dotted PostgREST embed filter,
  // which filters the embedded relation's shape, not which parent rows
  // come back — not what we want for a subject-wide list.
  if (subjectId && needsCategorization !== "true") mapped = mapped.filter((q) => q.subject_id === subjectId);

  return NextResponse.json({ questions: mapped });
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { prompt, options, correct_option, explanation, difficulty, image_url, set_id } = body ?? {};

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }
  const optionsError = validateOptions(options, correct_option);
  if (optionsError) return NextResponse.json({ error: optionsError }, { status: 400 });
  if (!set_id) {
    return NextResponse.json({ error: "A Subject/Set is required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("proctored_questions")
    .insert({
      prompt: prompt.trim(),
      options: (options as string[]).map((o) => o.trim()),
      correct_option: Number(correct_option),
      explanation: explanation?.trim() || null,
      difficulty: difficulty || "unknown",
      image_url: image_url || null,
      set_id,
      needs_categorization: false,
      created_by: user.id,
    })
    .select(SELECT_WITH_JOINS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question: mapQuestion(data) }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, prompt, options, correct_option, explanation, difficulty, image_url, set_id } = body ?? {};

  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  if (options !== undefined || correct_option !== undefined) {
    const optionsError = validateOptions(options, correct_option);
    if (optionsError) return NextResponse.json({ error: optionsError }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("proctored_questions")
    .update({
      ...(prompt?.trim() ? { prompt: prompt.trim() } : {}),
      ...(options ? { options: (options as string[]).map((o) => o.trim()) } : {}),
      ...(correct_option !== undefined ? { correct_option: Number(correct_option) } : {}),
      ...(explanation !== undefined ? { explanation: explanation?.trim() || null } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(image_url !== undefined ? { image_url: image_url || null } : {}),
      ...(set_id !== undefined ? { set_id: set_id || null, needs_categorization: !set_id } : {}),
    })
    .eq("id", id)
    .select(SELECT_WITH_JOINS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question: mapQuestion(data) });
}

export async function DELETE(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("proctored_questions").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
