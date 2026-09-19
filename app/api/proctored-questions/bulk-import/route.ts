import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// POST /api/proctored-questions/bulk-import { questions: [{ prompt, options, correct_option, set_id, explanation?, difficulty? }] }
// -> teacher/admin only. Only ever called from the review screen after
// the teacher has confirmed every parsed question — nothing from the
// paste-and-parse step reaches here unreviewed. Each question needs
// its own set_id (either the bulk target applied to all, or a
// per-question override — resolved client-side before this call).
// All-or-nothing: if any row fails validation, nothing is inserted.
export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { questions } = await req.json();
  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "No questions to import." }, { status: 400 });
  }

  const rows = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const prompt = String(q?.prompt ?? "").trim();
    const options = Array.isArray(q?.options) ? q.options.map((o: unknown) => String(o ?? "").trim()).filter(Boolean) : [];
    const correctIdx = Number(q?.correct_option);

    if (!prompt) return NextResponse.json({ error: `Question ${i + 1}: prompt is required.` }, { status: 400 });
    if (options.length < 2) return NextResponse.json({ error: `Question ${i + 1}: at least 2 options are required.` }, { status: 400 });
    if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx >= options.length) {
      return NextResponse.json({ error: `Question ${i + 1}: select the correct option.` }, { status: 400 });
    }
    if (!q?.set_id) return NextResponse.json({ error: `Question ${i + 1}: a Subject/Set is required.` }, { status: 400 });

    rows.push({
      prompt,
      options,
      correct_option: correctIdx,
      explanation: q?.explanation?.trim() || null,
      difficulty: q?.difficulty || "unknown",
      set_id: q.set_id,
      needs_categorization: false,
      created_by: user.id,
    });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from("proctored_questions").insert(rows).select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported: data?.length ?? 0 }, { status: 201 });
}
