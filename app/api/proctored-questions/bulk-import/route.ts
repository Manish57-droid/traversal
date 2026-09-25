import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// POST /api/proctored-questions/bulk-import { questions: [{ prompt, options, correct_option, subject_id, set_ids?, explanation?, difficulty? }] }
// -> teacher/admin only. Only ever called from the review screen after
// the teacher has confirmed every parsed question — nothing from the
// paste-and-parse step reaches here unreviewed. Each question needs
// its own subject_id (either the bulk target applied to all, or a
// per-question override — resolved client-side before this call);
// set_ids is optional. All-or-nothing: if any row fails validation,
// nothing is inserted.
export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { questions } = await req.json();
  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "No questions to import." }, { status: 400 });
  }

  const rows = [];
  const setIdsByIndex: string[][] = [];
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
    if (!q?.subject_id) return NextResponse.json({ error: `Question ${i + 1}: a Subject is required.` }, { status: 400 });

    rows.push({
      prompt,
      options,
      correct_option: correctIdx,
      explanation: q?.explanation?.trim() || null,
      difficulty: q?.difficulty || "unknown",
      subject_id: q.subject_id,
      needs_categorization: false,
      created_by: user.id,
    });
    setIdsByIndex.push(Array.isArray(q?.set_ids) ? q.set_ids.filter(Boolean) : []);
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from("proctored_questions").insert(rows).select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const junctionRows = (data ?? []).flatMap((row, i) => setIdsByIndex[i].map((set_id) => ({ question_id: row.id, set_id })));
  if (junctionRows.length > 0) {
    const { error: linkError } = await supabase.from("proctored_question_sets").insert(junctionRows);
    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ imported: data?.length ?? 0 }, { status: 201 });
}
