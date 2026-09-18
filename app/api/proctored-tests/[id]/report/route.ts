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

// GET /api/proctored-tests/[id]/report -> downloads an .xlsx workbook:
// Summary (pass/fail pie + per-student table), Detailed Answers
// (one row per student per question), Violations (one row per logged
// violation). Same class-scoped authorization as every other
// teacher-facing proctored-tests route.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseAdmin();

  const { data: test } = await supabase.from("proctored_tests").select("*").eq("id", params.id).maybeSingle();
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const user = await requireReportAccess([test.class_id]);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: klass } = await supabase.from("classes").select("name").eq("id", test.class_id).maybeSingle();
  const className = klass?.name ?? "Class";

  const { data: attempts } = await supabase
    .from("proctored_test_attempts")
    .select("*, users(full_name, email)")
    .eq("test_id", params.id)
    .order("started_at", { ascending: true });

  const attemptRows = attempts ?? [];
  const attemptIds = attemptRows.map((a) => a.id);

  const { data: violations } = attemptIds.length
    ? await supabase
        .from("proctored_violations")
        .select("attempt_id, violation_type, occurred_at")
        .in("attempt_id", attemptIds)
        .order("occurred_at", { ascending: true })
    : { data: [] };

  const { data: testQuestions } = await supabase
    .from("proctored_test_questions")
    .select("position, proctored_questions(id, prompt, options, correct_option)")
    .eq("test_id", params.id)
    .order("position", { ascending: true });

  const questions = (testQuestions ?? [])
    .map((row: any) => row.proctored_questions)
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

  // Width-only column config — no `header`/`key` here, since assigning
  // `.columns` with a `header` auto-writes row 1, which would collide
  // with the chart image anchored there. The header row is written
  // manually below, at `tableStartRow`, instead.
  summarySheet.columns = [{ width: 24 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 22 }, { width: 12 }];

  summarySheet.getRow(tableStartRow).values = [
    "Student name",
    "Score",
    "Total questions",
    "Violation count",
    "Status",
    "Time taken",
  ];
  styleHeaderRow(summarySheet.getRow(tableStartRow));

  attemptRows.forEach((a, i) => {
    summarySheet.getRow(tableStartRow + 1 + i).values = [
      a.users?.full_name || a.users?.email || "Unknown",
      a.score,
      a.total_questions,
      a.violation_count,
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

  // ---------- Sheet 3: Violations ----------
  const violationSheet = workbook.addWorksheet("Violations");
  violationSheet.columns = [
    { header: "Student name", key: "name", width: 24 },
    { header: "Violation type", key: "type", width: 20 },
    { header: "Timestamp", key: "time", width: 24 },
  ];
  styleHeaderRow(violationSheet.getRow(1));

  const studentByAttempt = new Map(attemptRows.map((a) => [a.id, a.users?.full_name || a.users?.email || "Unknown"]));
  for (const v of violations ?? []) {
    violationSheet.addRow([
      studentByAttempt.get(v.attempt_id) ?? "Unknown",
      v.violation_type,
      new Date(v.occurred_at).toLocaleString(),
    ]);
  }

  const filename = `${safeFilenamePart(className)}_${safeFilenamePart(test.name)}_proctored_report.xlsx`;
  return excelResponse(workbook, filename);
}
