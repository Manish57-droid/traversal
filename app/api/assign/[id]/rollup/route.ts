import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization, isAuthorized } from "@/lib/classAccess";
import type { QuestionStatus } from "@/types";

// GET /api/assign/[id]/rollup -> per-student DSA completion rollup for
// one assignment: for every class member, how many of the question
// set's questions are completed/attempted/not_started. `progress` has
// no assignment_id of its own (it's a global per-(student,question)
// row), so "not started" here means no progress row exists yet for
// that pair — the best-available reading given the schema.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, class_id, question_set_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!assignment) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

  const classAuth = await getClassAuthorization(assignment.class_id, user.id, user.role);
  if (!isAuthorized(classAuth)) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const [{ data: members }, { data: items }] = await Promise.all([
    supabase.from("class_members").select("student_id, users(full_name, email)").eq("class_id", assignment.class_id),
    supabase.from("question_set_items").select("question_id").eq("question_set_id", assignment.question_set_id),
  ]);

  const questionIds = (items ?? []).map((i) => i.question_id);
  const studentIds = (members ?? []).map((m: any) => m.student_id);

  const { data: progressRows } = questionIds.length && studentIds.length
    ? await supabase
        .from("progress")
        .select("student_id, question_id, status")
        .in("student_id", studentIds)
        .in("question_id", questionIds)
    : { data: [] };

  const statusByPair = new Map<string, QuestionStatus>();
  for (const p of progressRows ?? []) {
    statusByPair.set(`${p.student_id}:${p.question_id}`, p.status);
  }

  const students = (members ?? []).map((m: any) => {
    let completed = 0;
    let attempted = 0;
    let notStarted = 0;
    for (const qid of questionIds) {
      const status = statusByPair.get(`${m.student_id}:${qid}`) ?? "not_started";
      if (status === "completed") completed += 1;
      else if (status === "attempted") attempted += 1;
      else notStarted += 1;
    }
    const total = questionIds.length;
    return {
      student_id: m.student_id,
      student_name: m.users?.full_name || m.users?.email || "Unknown",
      student_email: m.users?.email ?? "",
      completed,
      attempted,
      not_started: notStarted,
      completion_pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  return NextResponse.json({ students, question_count: questionIds.length });
}
