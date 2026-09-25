import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { newReportWorkbook, styleHeaderRow, safeFilenamePart, excelResponse } from "@/lib/reports";

// GET /api/proctored-questions/export?setId=... or ?subjectId=...
// -> downloads an .xlsx listing every question in the Set (or every
// question under the Subject) for a teacher's own records/backup —
// not a student-facing export, so correct answers and explanations
// are included in full.
export async function GET(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const setId = searchParams.get("setId");
  const subjectId = searchParams.get("subjectId");
  if (!setId && !subjectId) {
    return NextResponse.json({ error: "setId or subjectId is required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  let questionIds: string[] | null = null;
  let exportName = "Questions";

  if (setId) {
    const { data: set } = await supabase.from("proctored_sets").select("id, name").eq("id", setId).maybeSingle();
    if (!set) return NextResponse.json({ error: "Set not found." }, { status: 404 });
    exportName = set.name;
    const { data: memberRows } = await supabase.from("proctored_question_sets").select("question_id").eq("set_id", setId);
    questionIds = (memberRows ?? []).map((r) => r.question_id);
    if (questionIds.length === 0) return NextResponse.json({ error: "This set has no questions to export." }, { status: 404 });
  } else if (subjectId) {
    const { data: subject } = await supabase.from("proctored_subjects").select("id, name").eq("id", subjectId).maybeSingle();
    if (!subject) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
    exportName = subject.name;
  }

  let query = supabase
    .from("proctored_questions")
    .select("*, proctored_subjects(name), proctored_question_sets(proctored_sets(name))")
    .order("created_at", { ascending: true });
  query = questionIds ? query.in("id", questionIds) : query.eq("subject_id", subjectId);

  const { data: questions, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = questions ?? [];
  const maxOptions = rows.reduce((max, q: any) => Math.max(max, (q.options ?? []).length), 0);

  const workbook = newReportWorkbook();
  const sheet = workbook.addWorksheet("Questions");

  const optionColumns = Array.from({ length: maxOptions }, (_, i) => ({
    header: `Option ${String.fromCharCode(65 + i)}`,
    key: `option${i}`,
    width: 28,
  }));

  sheet.columns = [
    { header: "Subject", key: "subject", width: 18 },
    { header: "Set", key: "set", width: 18 },
    { header: "Type", key: "type", width: 10 },
    { header: "Prompt", key: "prompt", width: 50 },
    ...optionColumns,
    { header: "Correct option", key: "correct", width: 30 },
    { header: "Max marks", key: "max_marks", width: 12 },
    { header: "Min word count", key: "min_word_count", width: 14 },
    { header: "Explanation", key: "explanation", width: 40 },
    { header: "Difficulty", key: "difficulty", width: 12 },
  ];
  styleHeaderRow(sheet.getRow(1));

  for (const q of rows as any[]) {
    const options: string[] = q.options ?? [];
    const row: Record<string, unknown> = {
      subject: q.proctored_subjects?.name ?? "",
      set: (q.proctored_question_sets ?? []).map((r: any) => r.proctored_sets?.name).filter(Boolean).join(", "),
      type: q.question_type ?? "mcq",
      prompt: q.prompt,
      correct: q.correct_option !== null && q.correct_option !== undefined ? options[q.correct_option] ?? "" : "",
      max_marks: q.max_marks ?? "",
      min_word_count: q.min_word_count ?? "",
      explanation: q.explanation ?? "",
      difficulty: q.difficulty,
    };
    options.forEach((opt, i) => {
      row[`option${i}`] = opt;
    });
    sheet.addRow(row);
  }

  const filename = `${safeFilenamePart(exportName)}_proctored_questions.xlsx`;
  return excelResponse(workbook, filename);
}
