import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET /api/account/blast-radius -> real counts of what would be
// destroyed if the signed-in user deleted their own account, for the
// confirmation panel on the profile page. Any signed-in, approved
// user — read-only, computing these counts never mutates anything.
// Same shape/logic as the admin blast-radius route
// (app/api/admin/users/[id]/blast-radius/route.ts), just scoped to
// the caller instead of an arbitrary target id.
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin();

  const { data: ownedClasses } = await supabase.from("classes").select("id").eq("teacher_id", user.id);
  const classIds = (ownedClasses ?? []).map((c) => c.id);

  const [
    { count: studentsEnrolledCount },
    { count: dsaQuestionsCount },
    { count: aptitudeQuestionsCount },
    { count: interviewQuestionsCount },
    { count: proctoredQuestionsCount },
    { count: adminCount },
  ] = await Promise.all([
    classIds.length
      ? supabase.from("class_members").select("*", { count: "exact", head: true }).in("class_id", classIds)
      : Promise.resolve({ count: 0 } as any),
    supabase.from("questions").select("*", { count: "exact", head: true }).eq("created_by", user.id),
    supabase.from("aptitude_questions").select("*", { count: "exact", head: true }).eq("created_by", user.id),
    supabase.from("interview_questions").select("*", { count: "exact", head: true }).eq("created_by", user.id),
    supabase.from("proctored_questions").select("*", { count: "exact", head: true }).eq("created_by", user.id),
    user.role === "admin"
      ? supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "admin")
      : Promise.resolve({ count: null } as any),
  ]);

  return NextResponse.json({
    classes_owned_count: classIds.length,
    students_enrolled_count: studentsEnrolledCount ?? 0,
    dsa_questions_authored_count: dsaQuestionsCount ?? 0,
    aptitude_questions_authored_count: aptitudeQuestionsCount ?? 0,
    interview_questions_authored_count: interviewQuestionsCount ?? 0,
    proctored_questions_authored_count: proctoredQuestionsCount ?? 0,
    is_last_admin: user.role === "admin" && (adminCount ?? 0) <= 1,
  });
}
