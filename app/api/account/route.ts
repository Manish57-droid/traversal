import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// DELETE /api/account { password } -> lets a signed-in user
// irreversibly delete their OWN account: their owned classes (and
// everything scoped to those classes), authored content across all
// four question banks (and any attempts/history tied to that
// content), their `users` row, then their Supabase Auth account.
// Reuses the same audit log + atomic cascade function the admin
// user-deletion flow uses (see app/api/admin/users/[id]/route.ts and
// supabase/migrations/0011_images_and_user_deletion.sql) — `deleted_by`
// is set to the caller's own id here, which is how a self-delete is
// told apart from an admin-triggered one in that log (deleted_by ===
// deleted_user_id means the user deleted themselves).
//
// Safeguards, in order:
//   1. Requires re-entering the current password — verified with a
//      real signInWithPassword call server-side (never trusts a
//      client-side-only check), same "prove you are you" bar as
//      changing a password on this same page.
//   2. Can't delete the account if it's the last remaining admin.
//   3. Re-captures the blast-radius counts server-side and writes
//      them to `user_deletion_log` BEFORE any destructive call, same
//      ordering guarantee as the admin flow.
export async function DELETE(req: Request) {
  const user = await getCurrentAppUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { password } = await req.json().catch(() => ({ password: null }));
  if (!password) {
    return NextResponse.json({ error: "Enter your password to confirm." }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (reauthError) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 400 });
  }

  if (user.role === "admin") {
    const { count: adminCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((adminCount ?? 0) <= 1) {
      return NextResponse.json(
        { error: "You're the last remaining admin — promote another admin before deleting this account." },
        { status: 400 }
      );
    }
  }

  const { data: ownedClasses } = await supabase.from("classes").select("id").eq("teacher_id", user.id);
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
    supabase.from("questions").select("*", { count: "exact", head: true }).eq("created_by", user.id),
    supabase.from("aptitude_questions").select("*", { count: "exact", head: true }).eq("created_by", user.id),
    supabase.from("interview_questions").select("*", { count: "exact", head: true }).eq("created_by", user.id),
    supabase.from("proctored_questions").select("*", { count: "exact", head: true }).eq("created_by", user.id),
  ]);

  const { error: logError } = await supabase.from("user_deletion_log").insert({
    deleted_user_id: user.id,
    deleted_user_email: user.email,
    deleted_user_name: user.full_name,
    deleted_user_role: user.role,
    deleted_by: user.id,
    classes_owned_count: classIds.length,
    students_enrolled_count: studentsEnrolledCount ?? 0,
    dsa_questions_authored_count: dsaQuestionsCount ?? 0,
    aptitude_questions_authored_count: aptitudeQuestionsCount ?? 0,
    interview_questions_authored_count: interviewQuestionsCount ?? 0,
    proctored_questions_authored_count: proctoredQuestionsCount ?? 0,
  });
  if (logError) {
    return NextResponse.json({ error: `Could not write deletion log, aborting: ${logError.message}` }, { status: 500 });
  }

  const { error: cascadeError } = await supabase.rpc("admin_delete_user_cascade", { p_user_id: user.id });
  if (cascadeError) {
    return NextResponse.json({ error: `Account deletion failed: ${cascadeError.message}` }, { status: 500 });
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
  if (authError) {
    return NextResponse.json(
      { error: `Your data was deleted, but the login itself could not be removed: ${authError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true });
}
