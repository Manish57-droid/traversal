import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getFlatQuestionsForTest, getSectionsForTest } from "@/lib/proctoredSections";
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

  const questions = await getFlatQuestionsForTest(params.id);
  const sections = await getSectionsForTest(params.id);
  const negativeMarkingBySection = new Map(sections.map((s) => [s.id, s.negative_marking_fraction ?? test.negative_marking_fraction]));

  const workbook = newReportWorkbook();

  // ---------- Sheet 1: Summary ----------
  // `max_score` (total possible marks) is the real denominator once a
  // theory question can be worth more than 1 point — it falls back to
  // total_questions for pre-theory attempts, where they were always
  // equal (every question was worth exactly 1).
  const finished = attemptRows.filter((a) => a.score !== null && (a.max_score ?? a.total_questions));
  const passCount = finished.filter((a) => a.score! >= (a.max_score ?? a.total_questions!) * PASS_THRESHOLD_FRACTION).length;
  const failCount = finished.length - passCount;

  const chartPng = await renderPieChartPng({
    labels: ["Pass", "Fail"],
    data: [passCount, failCount],
    colors: [REPORT_COLORS.pass, REPORT_COLORS.fail],
  });
  const { sheet: summarySheet, tableStartRow } = addChartSheet(workbook, "Summary", chartPng);

  summarySheet.getCell(`A${tableStartRow - 1}`).value = `Pass threshold: score >= ${Math.round(
    PASS_THRESHOLD_FRACTION * 100
  )}% of max score (hardcoded).`;
  summarySheet.getCell(`A${tableStartRow - 1}`).font = { italic: true, size: 10, color: { argb: "FF666666" } };

  // Width-only column config — no `header`/`key` here, since assigning
  // `.columns` with a `header` auto-writes row 1, which would collide
  // with the chart image anchored there. The header row is written
  // manually below, at `tableStartRow`, instead.
  summarySheet.columns = [{ width: 24 }, { width: 10 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 22 }, { width: 12 }];

  summarySheet.getRow(tableStartRow).values = [
    "Student name",
    "Score",
    "Max score",
    "Total questions",
    "Grading",
    "Violation count",
    "Status",
    "Time taken",
  ];
  styleHeaderRow(summarySheet.getRow(tableStartRow));

  attemptRows.forEach((a, i) => {
    summarySheet.getRow(tableStartRow + 1 + i).values = [
      a.users?.full_name || a.users?.email || "Unknown",
      a.score,
      a.max_score ?? a.total_questions,
      a.total_questions,
      a.grading_status ?? "not_required",
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
    const theoryGrades = (a.theory_grades ?? {}) as Record<string, number>;
    for (const q of questions) {
      if (q.question_type === "theory") {
        const answerText = (a.answers?.[q.id] as string | undefined) ?? "";
        const answered = answerText.trim().length > 0;
        const graded = Object.prototype.hasOwnProperty.call(theoryGrades, q.id);
        detailSheet.addRow([
          studentName,
          q.prompt,
          answered ? answerText : "(not answered)",
          `Theory — up to ${q.max_marks} marks`,
          answered ? (graded ? "Graded" : "Pending grading") : "Unanswered",
          graded ? theoryGrades[q.id] : "Pending",
        ]);
        continue;
      }
      const selectedIdx = a.answers?.[q.id];
      const answered = selectedIdx !== undefined && selectedIdx !== null;
      const isCorrect = answered && selectedIdx === q.correct_option;
      const points = !answered ? 0 : isCorrect ? 1 : -(negativeMarkingBySection.get(q.section_id) ?? test.negative_marking_fraction);
      detailSheet.addRow([
        studentName,
        q.prompt,
        answered ? q.options?.[selectedIdx as number] ?? `(option ${selectedIdx})` : "(not answered)",
        q.correct_option !== null ? q.options?.[q.correct_option] : "",
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
