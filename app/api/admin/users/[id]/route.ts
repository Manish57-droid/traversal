import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// DELETE /api/admin/users/[id] -> irreversibly deletes a user account:
// their owned classes (and everything scoped to those classes),
// authored content across all four question banks (and any attempts/
// history tied to that content), their `users` row, then their
// Supabase Auth account. Admin only.
//
// Safeguards, in order:
//   1. Can't target the caller's own account (same self-action guard
//      pattern as the role-change PATCH endpoint).
//   2. Can't delete the last remaining admin.
//   3. Re-captures the blast-radius counts server-side (never trusts
//      whatever the client displayed in the confirmation dialog) and
//      writes them to `user_deletion_log` BEFORE any destructive call
//      — this is the one record guaranteed to survive, since the
//      `admin_delete_user_cascade` function that follows runs as a
//      single Postgres transaction (all-or-nothing) and the log
//      insert already committed independently before it's invoked.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireRole(["admin"]).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (params.id === admin.id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: target } = await supabase
    .from("users")
    .select("id, full_name, email, role")
    .eq("id", params.id)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (target.role === "admin") {
    const { count: adminCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((adminCount ?? 0) <= 1) {
      return NextResponse.json({ error: "Cannot delete the last remaining admin account." }, { status: 400 });
    }
  }

  const { confirmEmail } = await req.json().catch(() => ({ confirmEmail: null }));
  if (!confirmEmail || confirmEmail.trim().toLowerCase() !== target.email.toLowerCase()) {
    return NextResponse.json({ error: "Typed email does not match — deletion cancelled." }, { status: 400 });
  }

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

  const { error: logError } = await supabase.from("user_deletion_log").insert({
    deleted_user_id: target.id,
    deleted_user_email: target.email,
    deleted_user_name: target.full_name,
    deleted_user_role: target.role,
    deleted_by: admin.id,
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

  const { error: cascadeError } = await supabase.rpc("admin_delete_user_cascade", { p_user_id: params.id });
  if (cascadeError) {
    return NextResponse.json({ error: `Cascade delete failed: ${cascadeError.message}` }, { status: 500 });
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(params.id);
  if (authError) {
    // The public.users row and all their content are already gone at
    // this point (the cascade above succeeded) — only the Auth
    // account itself failed to delete. Surface this plainly rather
    // than pretending the whole operation failed.
    return NextResponse.json(
      { error: `User data deleted, but the Auth account could not be removed: ${authError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true });
}
