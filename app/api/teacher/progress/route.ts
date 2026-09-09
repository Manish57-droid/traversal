import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthorizedClassIds, getClassAuthorization, isAuthorized } from "@/lib/classAccess";
import type { StudentProgressSummary } from "@/types";

// GET /api/teacher/progress?class_id=...
// Returns a per-student rollup (assigned / completed / attempted / not
// started) for one class, or every class the teacher can manage
// (owner or approved collaborator) if omitted.
export async function GET(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("class_id");

  const supabase = supabaseAdmin();
  let classIds: string[];

  if (classId) {
    const auth = await getClassAuthorization(classId, user.id, user.role);
    if (!isAuthorized(auth)) return NextResponse.json({ summaries: [] });
    classIds = [classId];
  } else {
    const authorizedIds = await getAuthorizedClassIds(user.id, user.role);
    if (authorizedIds !== null) {
      classIds = authorizedIds;
    } else {
      const { data: allClasses, error } = await supabase.from("classes").select("id");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      classIds = (allClasses ?? []).map((c) => c.id);
    }
  }

  if (!classIds.length) return NextResponse.json({ summaries: [] });

  const { data: classes, error: classError } = await supabase
    .from("classes")
    .select("id, name")
    .in("id", classIds);
  if (classError) return NextResponse.json({ error: classError.message }, { status: 500 });

  const { data: members, error: memberError } = await supabase
    .from("class_members")
    .select("student_id, class_id, users(id, full_name, email)")
    .in("class_id", classIds);

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

  const studentIds = [...new Set((members ?? []).map((m: any) => m.student_id))];
  if (!studentIds.length) return NextResponse.json({ summaries: [] });

  const { data: progressRows, error: progressError } = await supabase
    .from("progress")
    .select("student_id, status")
    .in("student_id", studentIds);

  if (progressError) return NextResponse.json({ error: progressError.message }, { status: 500 });

  const summaries: StudentProgressSummary[] = studentIds.map((sid) => {
    const member: any = (members ?? []).find((m: any) => m.student_id === sid);
    const rows = (progressRows ?? []).filter((p) => p.student_id === sid);
    return {
      student_id: sid,
      full_name: member?.users?.full_name ?? null,
      email: member?.users?.email ?? "",
      total_assigned: rows.length,
      completed: rows.filter((r) => r.status === "completed").length,
      attempted: rows.filter((r) => r.status === "attempted").length,
      not_started: rows.filter((r) => r.status === "not_started").length,
    };
  });

  return NextResponse.json({ summaries, classes });
}
