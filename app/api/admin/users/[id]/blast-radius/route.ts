import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET /api/admin/users/[id]/blast-radius -> real counts of what would
// be destroyed if this user were deleted, for the confirmation dialog.
// Admin only. Read-only — computing these counts never mutates anything.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireRole(["admin"]).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();

  const { data: target } = await supabase
    .from("users")
    .select("id, full_name, email, role")
    .eq("id", params.id)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const { data: ownedClasses } = await supabase.from("classes").select("id").eq("teacher_id", params.id);
  const classIds = (ownedClasses ?? []).map((c) => c.id);

  const [
    { count: studentsEnrolledCount },
    { count: dsaQuestionsCount },
    { count: aptitudeQuestionsCount },
    { count: interviewQuestionsCount },
    { count: proctoredQuestionsCount },
  ] = await Promise.all([
    classIds.length
      ? supabase.from("class_members").select("*", { count: "exact", head: true }).in("class_id", classIds)
      : Promise.resolve({ count: 0 } as any),
    supabase.from("questions").select("*", { count: "exact", head: true }).eq("created_by", params.id),
    supabase.from("aptitude_questions").select("*", { count: "exact", head: true }).eq("created_by", params.id),
    supabase.from("interview_questions").select("*", { count: "exact", head: true }).eq("created_by", params.id),
    supabase.from("proctored_questions").select("*", { count: "exact", head: true }).eq("created_by", params.id),
  ]);

  return NextResponse.json({
    user: target,
    classes_owned_count: classIds.length,
    students_enrolled_count: studentsEnrolledCount ?? 0,
    dsa_questions_authored_count: dsaQuestionsCount ?? 0,
    aptitude_questions_authored_count: aptitudeQuestionsCount ?? 0,
    interview_questions_authored_count: interviewQuestionsCount ?? 0,
    proctored_questions_authored_count: proctoredQuestionsCount ?? 0,
  });
}
