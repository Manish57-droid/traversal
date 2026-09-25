import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ProctoredQuestion } from "@/types";

const DEFAULT_MIN_WORD_COUNT = 150;

// GET    /api/proctored-questions?setId=...&subjectId=...&needsCategorization=true
//         -> list every question in the bank, with the author's name
//         and its subject/sets resolved. Any signed-in role can read
//         (teachers/admins manage the bank directly; students never
//         see this bank outside of an actual test attempt, which the
//         follow-up test-taking task will scope separately). Filters
//         are optional and combinable; needsCategorization=true finds
//         legacy/unassigned questions regardless of subject/set filters.
// POST   /api/proctored-questions { prompt, options, correct_option, subject_id, set_ids?, explanation?, difficulty? }
//         -> teacher/admin only. subject_id is required for new questions;
//         set_ids is optional — a question can belong to any number of
//         Sets (or none), independent of its subject.
// PATCH  /api/proctored-questions { id, ...fields } -> teacher/admin only.
//         subject_id: null explicitly un-assigns and flags needs_categorization.
//         set_ids, when present, REPLACES the question's full Set membership.
// DELETE /api/proctored-questions { id } -> teacher/admin only.
function mapQuestion(q: any): ProctoredQuestion {
  return {
    id: q.id,
    question_type: q.question_type ?? "mcq",
    prompt: q.prompt,
    options: q.options,
    correct_option: q.correct_option,
    min_word_count: q.min_word_count,
    max_marks: q.max_marks,
    explanation: q.explanation,
    difficulty: q.difficulty,
    created_by: q.created_by,
    created_by_name: q.users?.full_name || q.users?.email || null,
    created_at: q.created_at,
    image_url: q.image_url ?? null,
    sets: (q.proctored_question_sets ?? [])
      .map((row: any) => row.proctored_sets)
      .filter(Boolean)
      .map((s: any) => ({ id: s.id, name: s.name })),
    subject_id: q.subject_id ?? null,
    subject_name: q.proctored_subjects?.name ?? null,
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

function validateMaxMarks(max_marks: unknown) {
  const marks = Number(max_marks);
  if (!Number.isFinite(marks) || marks <= 0) {
    return "max_marks must be a positive number for a theory question.";
  }
  return null;
}

const SELECT_WITH_JOINS =
  "*, users(full_name, email), proctored_subjects(name), proctored_question_sets(proctored_sets(id, name))";

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
  } else if (subjectId) {
    query = query.eq("subject_id", subjectId);
  }

  if (setId) {
    const { data: memberRows, error: memberError } = await supabase
      .from("proctored_question_sets")
      .select("question_id")
      .eq("set_id", setId);
    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });
    const questionIds = (memberRows ?? []).map((r) => r.question_id);
    query = query.in("id", questionIds.length ? questionIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ questions: (data ?? []).map(mapQuestion) });
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    question_type,
    prompt,
    options,
    correct_option,
    min_word_count,
    max_marks,
    explanation,
    difficulty,
    image_url,
    subject_id,
    set_ids,
  } = body ?? {};
  const type = question_type === "theory" ? "theory" : "mcq";

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }
  if (type === "mcq") {
    const optionsError = validateOptions(options, correct_option);
    if (optionsError) return NextResponse.json({ error: optionsError }, { status: 400 });
  } else {
    const marksError = validateMaxMarks(max_marks);
    if (marksError) return NextResponse.json({ error: marksError }, { status: 400 });
  }
  if (!subject_id) {
    return NextResponse.json({ error: "A Subject is required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("proctored_questions")
    .insert({
      question_type: type,
      prompt: prompt.trim(),
      options: type === "mcq" ? (options as string[]).map((o) => o.trim()) : null,
      correct_option: type === "mcq" ? Number(correct_option) : null,
      min_word_count: type === "theory" ? Number(min_word_count) || DEFAULT_MIN_WORD_COUNT : null,
      max_marks: type === "theory" ? Number(max_marks) : null,
      explanation: explanation?.trim() || null,
      difficulty: difficulty || "unknown",
      image_url: image_url || null,
      subject_id,
      needs_categorization: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const setIds = Array.isArray(set_ids) ? (set_ids as string[]).filter(Boolean) : [];
  if (setIds.length > 0) {
    const { error: linkError } = await supabase
      .from("proctored_question_sets")
      .insert(setIds.map((set_id) => ({ question_id: data.id, set_id })));
    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  const { data: full, error: refetchError } = await supabase
    .from("proctored_questions")
    .select(SELECT_WITH_JOINS)
    .eq("id", data.id)
    .single();
  if (refetchError) return NextResponse.json({ error: refetchError.message }, { status: 500 });

  return NextResponse.json({ question: mapQuestion(full) }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    id,
    question_type,
    prompt,
    options,
    correct_option,
    min_word_count,
    max_marks,
    explanation,
    difficulty,
    image_url,
    subject_id,
    set_ids,
  } = body ?? {};

  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  // A question's type is always resent by the editing UI (it always
  // loads the full question, including its type, before saving) — so
  // when it's present, this always rewrites BOTH type-specific field
  // groups together (the other type's fields going to null), which is
  // the only way to keep proctored_questions_type_shape satisfied if a
  // question's type is ever changed mid-edit.
  const type = question_type === "theory" ? "theory" : question_type === "mcq" ? "mcq" : undefined;
  if (type === "mcq") {
    const optionsError = validateOptions(options, correct_option);
    if (optionsError) return NextResponse.json({ error: optionsError }, { status: 400 });
  } else if (type === "theory") {
    const marksError = validateMaxMarks(max_marks);
    if (marksError) return NextResponse.json({ error: marksError }, { status: 400 });
  } else if (options !== undefined || correct_option !== undefined) {
    // No type given (an older client) but MCQ fields were — keep the
    // pre-theory validation behavior for that case.
    const optionsError = validateOptions(options, correct_option);
    if (optionsError) return NextResponse.json({ error: optionsError }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("proctored_questions")
    .update({
      ...(type ? { question_type: type } : {}),
      ...(prompt?.trim() ? { prompt: prompt.trim() } : {}),
      ...(type === "mcq"
        ? { options: (options as string[]).map((o) => o.trim()), correct_option: Number(correct_option), min_word_count: null, max_marks: null }
        : type === "theory"
          ? { options: null, correct_option: null, min_word_count: Number(min_word_count) || DEFAULT_MIN_WORD_COUNT, max_marks: Number(max_marks) }
          : {
              ...(options ? { options: (options as string[]).map((o) => o.trim()) } : {}),
              ...(correct_option !== undefined ? { correct_option: Number(correct_option) } : {}),
            }),
      ...(explanation !== undefined ? { explanation: explanation?.trim() || null } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(image_url !== undefined ? { image_url: image_url || null } : {}),
      ...(subject_id !== undefined ? { subject_id: subject_id || null, needs_categorization: !subject_id } : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(set_ids)) {
    const setIds = (set_ids as string[]).filter(Boolean);
    const { error: clearError } = await supabase.from("proctored_question_sets").delete().eq("question_id", id);
    if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });
    if (setIds.length > 0) {
      const { error: linkError } = await supabase
        .from("proctored_question_sets")
        .insert(setIds.map((set_id) => ({ question_id: id, set_id })));
      if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });
    }
  }

  const { data: full, error: refetchError } = await supabase
    .from("proctored_questions")
    .select(SELECT_WITH_JOINS)
    .eq("id", data.id)
    .single();
  if (refetchError) return NextResponse.json({ error: refetchError.message }, { status: 500 });

  return NextResponse.json({ question: mapQuestion(full) });
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
