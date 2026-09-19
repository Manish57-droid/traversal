import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getFlatQuestionsForTest } from "@/lib/proctoredSections";
import { requireReportAccess, newReportWorkbook, styleHeaderRow, safeFilenamePart, excelResponse } from "@/lib/reports";

// GET /api/proctored-tests/[id]/questions-export -> downloads an .xlsx
// of exactly the questions this test currently draws on (via
// getFlatQuestionsForTest — the same section-aware, always-current
// resolution the take screen and scoring use), for a teacher's own
// records of what was actually given. Same class-scoped authorization
// as the results report next to it.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseAdmin();

  const { data: test } = await supabase.from("proctored_tests").select("id, name, class_id").eq("id", params.id).maybeSingle();
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const user = await requireReportAccess([test.class_id]);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const questions = await getFlatQuestionsForTest(params.id);
  if (questions.length === 0) {
    return NextResponse.json({ error: "This test has no questions to export." }, { status: 404 });
  }

  const maxOptions = questions.reduce((max, q) => Math.max(max, q.options.length), 0);

  const workbook = newReportWorkbook();
  const sheet = workbook.addWorksheet("Questions");

  const optionColumns = Array.from({ length: maxOptions }, (_, i) => ({
    header: `Option ${String.fromCharCode(65 + i)}`,
    key: `option${i}`,
    width: 28,
  }));

  sheet.columns = [
    { header: "Section", key: "section", width: 18 },
    { header: "Prompt", key: "prompt", width: 50 },
    ...optionColumns,
    { header: "Correct option", key: "correct", width: 30 },
    { header: "Explanation", key: "explanation", width: 40 },
    { header: "Difficulty", key: "difficulty", width: 12 },
  ];
  styleHeaderRow(sheet.getRow(1));

  for (const q of questions) {
    const row: Record<string, unknown> = {
      section: q.section_name,
      prompt: q.prompt,
      correct: q.options[q.correct_option] ?? "",
      explanation: q.explanation ?? "",
      difficulty: q.difficulty,
    };
    q.options.forEach((opt, i) => {
      row[`option${i}`] = opt;
    });
    sheet.addRow(row);
  }

  const filename = `${safeFilenamePart(test.name)}_question_bank.xlsx`;
  return excelResponse(workbook, filename);
}
