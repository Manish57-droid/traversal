import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ProctoredQuestion } from "@/types";

// GET    /api/proctored-questions -> list every question in the bank,
//         with the author's name resolved. Any signed-in role can
//         read (teachers/admins manage the bank directly; students
//         never see this bank outside of an actual test attempt,
//         which the follow-up test-taking task will scope separately).
// POST   /api/proctored-questions { prompt, options, correct_option, explanation?, difficulty? }
//         -> teacher/admin only.
// PATCH  /api/proctored-questions { id, ...fields } -> teacher/admin only.
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

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("proctored_questions")
    .select("*, users(full_name, email)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ questions: (data ?? []).map(mapQuestion) });
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { prompt, options, correct_option, explanation, difficulty, image_url } = body ?? {};

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }
  const optionsError = validateOptions(options, correct_option);
  if (optionsError) return NextResponse.json({ error: optionsError }, { status: 400 });

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
      created_by: user.id,
    })
    .select("*, users(full_name, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question: mapQuestion(data) }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, prompt, options, correct_option, explanation, difficulty, image_url } = body ?? {};

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
    })
    .eq("id", id)
    .select("*, users(full_name, email)")
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
