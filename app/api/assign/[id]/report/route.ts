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
} from "@/lib/reports";
import type { QuestionStatus } from "@/types";

const STATUS_LABEL: Record<QuestionStatus, string> = {
  completed: "Completed",
  attempted: "Attempted",
  not_started: "Not started",
};

// GET /api/assign/[id]/report -> downloads an .xlsx workbook for one
// DSA assignment: Summary (completion-status pie across the whole
// class + per-student table), Detailed Status (one row per student
// per question). No pass/fail or scoring here — DSA has no
// correct/wrong, just a completion checkbox.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseAdmin();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, class_id, question_set_id, question_sets(name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!assignment) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

  const user = await requireReportAccess([assignment.class_id]);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ data: klass }, { data: members }, { data: items }] = await Promise.all([
    supabase.from("classes").select("name").eq("id", assignment.class_id).maybeSingle(),
    supabase.from("class_members").select("student_id, users(full_name, email)").eq("class_id", assignment.class_id),
    supabase
      .from("question_set_items")
      .select("questions(id, title, url, platform)")
      .eq("question_set_id", assignment.question_set_id),
  ]);

  const className = klass?.name ?? "Class";
  const questionSetName = (assignment as any).question_sets?.name ?? "Question set";
  const questions = (items ?? []).map((i: any) => i.questions).filter(Boolean) as {
    id: string;
    title: string;
    url: string | null;
    platform: string;
  }[];
  const questionIds = questions.map((q) => q.id);
  const studentIds = (members ?? []).map((m: any) => m.student_id);

  const { data: progressRows } = questionIds.length && studentIds.length
    ? await supabase
        .from("progress")
        .select("student_id, question_id, status")
        .in("student_id", studentIds)
        .in("question_id", questionIds)
    : { data: [] };

  const statusByPair = new Map<string, QuestionStatus>();
  for (const p of progressRows ?? []) statusByPair.set(`${p.student_id}:${p.question_id}`, p.status);

  const studentRows = (members ?? []).map((m: any) => {
    let completed = 0;
    let attempted = 0;
    let notStarted = 0;
    for (const qid of questionIds) {
      const status = statusByPair.get(`${m.student_id}:${qid}`) ?? "not_started";
      if (status === "completed") completed += 1;
      else if (status === "attempted") attempted += 1;
      else notStarted += 1;
    }
    return {
      name: m.users?.full_name || m.users?.email || "Unknown",
      completed,
      attempted,
      not_started: notStarted,
      pct: questionIds.length > 0 ? Math.round((completed / questionIds.length) * 100) : 0,
    };
  });

  const totalCompleted = studentRows.reduce((s, r) => s + r.completed, 0);
  const totalAttempted = studentRows.reduce((s, r) => s + r.attempted, 0);
  const totalNotStarted = studentRows.reduce((s, r) => s + r.not_started, 0);

  const workbook = newReportWorkbook();

  // ---------- Sheet 1: Summary ----------
  const chartPng = await renderPieChartPng({
    labels: ["Completed", "Attempted", "Not started"],
    data: [totalCompleted, totalAttempted, totalNotStarted],
    colors: [REPORT_COLORS.pass, REPORT_COLORS.attempted, REPORT_COLORS.neutral],
  });
  const { sheet: summarySheet, tableStartRow } = addChartSheet(workbook, "Summary", chartPng);

  summarySheet.columns = [{ width: 24 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 18 }];
  summarySheet.getRow(tableStartRow).values = [
    "Student name",
    "Completed",
    "Attempted",
    "Not started",
    "Completion %",
  ];
  styleHeaderRow(summarySheet.getRow(tableStartRow));

  studentRows.forEach((r, i) => {
    summarySheet.getRow(tableStartRow + 1 + i).values = [r.name, r.completed, r.attempted, r.not_started, r.pct];
  });

  // ---------- Sheet 2: Detailed Status ----------
  const detailSheet = workbook.addWorksheet("Detailed Status");
  detailSheet.columns = [
    { header: "Student name", key: "name", width: 24 },
    { header: "Question", key: "question", width: 40 },
    { header: "Platform link", key: "link", width: 40 },
    { header: "Status", key: "status", width: 16 },
  ];
  styleHeaderRow(detailSheet.getRow(1));

  for (const m of members ?? []) {
    const studentName = (m as any).users?.full_name || (m as any).users?.email || "Unknown";
    for (const q of questions) {
      const status = statusByPair.get(`${(m as any).student_id}:${q.id}`) ?? "not_started";
      detailSheet.addRow([
        studentName,
        q.title,
        q.url ?? "(no link yet)",
        STATUS_LABEL[status as QuestionStatus],
      ]);
    }
  }

  const filename = `${safeFilenamePart(className)}_${safeFilenamePart(questionSetName)}_dsa_report.xlsx`;
  return excelResponse(workbook, filename);
}
