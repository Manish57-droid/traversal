import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ClassAnalyticsSummary, StudentAnalyticsRow } from "@/types";

// GET /api/teacher/analytics?classId=...
// Combined DSA + Aptitude rollup for one class: class-wide totals for
// the summary charts, plus a per-student row for the sortable table.
// Teacher/admin only, and a teacher may only see their own classes.
export async function GET(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  if (!classId) return NextResponse.json({ error: "classId is required." }, { status: 400 });

  const supabase = supabaseAdmin();

  let classQuery = supabase.from("classes").select("id, name").eq("id", classId);
  if (user.role !== "admin") classQuery = classQuery.eq("teacher_id", user.id);
  const { data: klass, error: classError } = await classQuery.maybeSingle();

  if (classError) return NextResponse.json({ error: classError.message }, { status: 500 });
  if (!klass) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  const { data: members, error: memberError } = await supabase
    .from("class_members")
    .select("student_id, users(id, full_name, email)")
    .eq("class_id", classId);

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

  const studentIds = (members ?? []).map((m: any) => m.student_id);
  if (!studentIds.length) {
    return NextResponse.json({
      summary: { dsa: { completed: 0, attempted: 0, not_started: 0 }, aptitude: { attempted: 0, correct: 0, incorrect: 0 } },
      students: [],
    });
  }

  // DSA: every progress row for these students. Note (same simplification
  // as /api/teacher/progress): `progress` isn't itself class-scoped, so a
  // student in more than one class sees their progress across all of
  // them here, not just this class's assignments.
  const { data: progressRows, error: progressError } = await supabase
    .from("progress")
    .select("student_id, status")
    .in("student_id", studentIds);

  if (progressError) return NextResponse.json({ error: progressError.message }, { status: 500 });

  // Aptitude: practice mode has no class/assignment scoping yet (Test
  // Mode isn't built) — every practice-history row for these students.
  const { data: aptitudeRows, error: aptitudeError } = await supabase
    .from("aptitude_practice_history")
    .select("student_id, last_correct")
    .in("student_id", studentIds);

  if (aptitudeError) return NextResponse.json({ error: aptitudeError.message }, { status: 500 });

  const summary: ClassAnalyticsSummary = {
    dsa: {
      completed: (progressRows ?? []).filter((r) => r.status === "completed").length,
      attempted: (progressRows ?? []).filter((r) => r.status === "attempted").length,
      not_started: (progressRows ?? []).filter((r) => r.status === "not_started").length,
    },
    aptitude: {
      attempted: (aptitudeRows ?? []).length,
      correct: (aptitudeRows ?? []).filter((r) => r.last_correct === true).length,
      incorrect: (aptitudeRows ?? []).filter((r) => r.last_correct === false).length,
    },
  };

  const students: StudentAnalyticsRow[] = (members ?? []).map((m: any) => {
    const dsaRows = (progressRows ?? []).filter((r) => r.student_id === m.student_id);
    const aptRows = (aptitudeRows ?? []).filter((r) => r.student_id === m.student_id);
    const dsaCompleted = dsaRows.filter((r) => r.status === "completed").length;
    const aptCorrect = aptRows.filter((r) => r.last_correct === true).length;

    return {
      student_id: m.student_id,
      full_name: m.users?.full_name ?? null,
      email: m.users?.email ?? "",
      dsa_completion_pct: dsaRows.length ? Math.round((dsaCompleted / dsaRows.length) * 100) : 0,
      aptitude_accuracy_pct: aptRows.length ? Math.round((aptCorrect / aptRows.length) * 100) : 0,
      total_attempted: dsaRows.length + aptRows.length,
    };
  });

  return NextResponse.json({ summary, students, class: klass });
}
