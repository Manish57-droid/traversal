import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  requireReportAccess,
  renderPieChartPng,
  newReportWorkbook,
  styleHeaderRow,
  addChartSheet,
  safeFilenamePart,
  excelResponse,
  REPORT_COLORS,
  PASS_THRESHOLD_FRACTION,
} from "@/lib/reports";

function formatTime(seconds: number | null) {
  if (seconds === null) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// GET /api/aptitude/tests/[id]/report?classId=xxx -> downloads an
// .xlsx workbook scoped to one class: Summary (pass/fail pie +
// per-student table), Detailed Answers (one row per student per
// question). No Violations sheet — Aptitude Test Mode isn't proctored.
// `classId` disambiguates which assignment this report is for, since
// (unlike Proctored Tests) one aptitude test can in principle be
// assigned to more than one class.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  if (!classId) return NextResponse.json({ error: "classId is required." }, { status: 400 });

  const supabase = supabaseAdmin();

  const { data: test } = await supabase.from("aptitude_tests").select("*").eq("id", params.id).maybeSingle();
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const { data: assignment } = await supabase
    .from("aptitude_assignments")
    .select("class_id")
    .eq("test_id", params.id)
    .eq("class_id", classId)
    .maybeSingle();
  if (!assignment) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const user = await requireReportAccess([classId]);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: klass } = await supabase.from("classes").select("name").eq("id", classId).maybeSingle();
  const className = klass?.name ?? "Class";

  const { data: members } = await supabase.from("class_members").select("student_id").eq("class_id", classId);
  const memberIds = new Set((members ?? []).map((m) => m.student_id));

  const { data: attemptsRaw } = await supabase
    .from("aptitude_test_attempts")
    .select("*, users(full_name, email)")
    .eq("test_id", params.id)
    .order("started_at", { ascending: true });

  // Scope strictly to this class's members, even if the test happens
  // to be assigned elsewhere too.
  const attemptRows = (attemptsRaw ?? []).filter((a) => memberIds.has(a.student_id));

  const { data: testQuestions } = await supabase
    .from("aptitude_test_questions")
    .select("position, aptitude_questions(id, prompt, options, correct_option)")
    .eq("test_id", params.id)
    .order("position", { ascending: true });

  const questions = (testQuestions ?? [])
    .map((row: any) => row.aptitude_questions)
    .filter(Boolean) as { id: string; prompt: string; options: string[]; correct_option: number }[];

  const workbook = newReportWorkbook();

  // ---------- Sheet 1: Summary ----------
  const finished = attemptRows.filter((a) => a.score !== null && a.total_questions);
  const passCount = finished.filter((a) => a.score! >= a.total_questions! * PASS_THRESHOLD_FRACTION).length;
  const failCount = finished.length - passCount;

  const chartPng = await renderPieChartPng({
    labels: ["Pass", "Fail"],
    data: [passCount, failCount],
    colors: [REPORT_COLORS.pass, REPORT_COLORS.fail],
  });
  const { sheet: summarySheet, tableStartRow } = addChartSheet(workbook, "Summary", chartPng);

  summarySheet.getCell(`A${tableStartRow - 1}`).value = `Pass threshold: score >= ${Math.round(
    PASS_THRESHOLD_FRACTION * 100
  )}% of total questions (hardcoded).`;
  summarySheet.getCell(`A${tableStartRow - 1}`).font = { italic: true, size: 10, color: { argb: "FF666666" } };

  summarySheet.columns = [{ width: 24 }, { width: 10 }, { width: 14 }, { width: 22 }, { width: 12 }];

  summarySheet.getRow(tableStartRow).values = ["Student name", "Score", "Total questions", "Status", "Time taken"];
  styleHeaderRow(summarySheet.getRow(tableStartRow));

  attemptRows.forEach((a, i) => {
    summarySheet.getRow(tableStartRow + 1 + i).values = [
      a.users?.full_name || a.users?.email || "Unknown",
      a.score,
      a.total_questions,
      a.status,
      formatTime(a.time_taken_seconds),
    ];
  });

  // ---------- Sheet 2: Detailed Answers ----------
  const detailSheet = workbook.addWorksheet("Detailed Answers");
  detailSheet.columns = [
    { header: "Student name", key: "name", width: 24 },
    { header: "Question", key: "question", width: 50 },
    { header: "Selected option", key: "selected", width: 24 },
    { header: "Correct option", key: "correct", width: 24 },
    { header: "Result", key: "result", width: 12 },
    { header: "Points applied", key: "points", width: 14 },
  ];
  styleHeaderRow(detailSheet.getRow(1));

  for (const a of attemptRows) {
    const studentName = a.users?.full_name || a.users?.email || "Unknown";
    for (const q of questions) {
      const selectedIdx = a.answers?.[q.id];
      const answered = selectedIdx !== undefined && selectedIdx !== null;
      const isCorrect = answered && selectedIdx === q.correct_option;
      const points = !answered ? 0 : isCorrect ? 1 : -test.negative_marking_fraction;
      detailSheet.addRow([
        studentName,
        q.prompt,
        answered ? q.options[selectedIdx] ?? `(option ${selectedIdx})` : "(not answered)",
        q.options[q.correct_option],
        answered ? (isCorrect ? "Correct" : "Incorrect") : "Unanswered",
        points,
      ]);
    }
  }

  const filename = `${safeFilenamePart(className)}_${safeFilenamePart(test.name)}_aptitude_report.xlsx`;
  return excelResponse(workbook, filename);
}
