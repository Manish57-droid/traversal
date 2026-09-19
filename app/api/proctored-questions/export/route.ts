import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { newReportWorkbook, styleHeaderRow, safeFilenamePart, excelResponse } from "@/lib/reports";

// GET /api/proctored-questions/export?setId=... or ?subjectId=...
// -> downloads an .xlsx listing every question in the set (or every
// set under the subject) for a teacher's own records/backup — not a
// student-facing export, so correct answers and explanations are
// included in full.
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

  let setIds: string[] = [];
  let exportName = "Questions";

  if (setId) {
    const { data: set } = await supabase.from("proctored_sets").select("id, name").eq("id", setId).maybeSingle();
    if (!set) return NextResponse.json({ error: "Set not found." }, { status: 404 });
    setIds = [set.id];
    exportName = set.name;
  } else if (subjectId) {
    const { data: subject } = await supabase.from("proctored_subjects").select("id, name").eq("id", subjectId).maybeSingle();
    if (!subject) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
    const { data: sets } = await supabase.from("proctored_sets").select("id").eq("subject_id", subjectId);
    setIds = (sets ?? []).map((s) => s.id);
    exportName = subject.name;
  }

  if (setIds.length === 0) {
    return NextResponse.json({ error: "No sets found to export." }, { status: 404 });
  }

  const { data: questions, error } = await supabase
    .from("proctored_questions")
    .select("*, proctored_sets(name, proctored_subjects(name))")
    .in("set_id", setIds)
    .order("created_at", { ascending: true });

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
    { header: "Prompt", key: "prompt", width: 50 },
    ...optionColumns,
    { header: "Correct option", key: "correct", width: 30 },
    { header: "Explanation", key: "explanation", width: 40 },
    { header: "Difficulty", key: "difficulty", width: 12 },
  ];
  styleHeaderRow(sheet.getRow(1));

  for (const q of rows as any[]) {
    const options: string[] = q.options ?? [];
    const row: Record<string, unknown> = {
      subject: q.proctored_sets?.proctored_subjects?.name ?? "",
      set: q.proctored_sets?.name ?? "",
      prompt: q.prompt,
      correct: options[q.correct_option] ?? "",
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
