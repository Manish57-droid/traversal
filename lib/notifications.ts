import { supabaseAdmin } from "@/lib/supabase/server";

export type NotificationType = "class_material" | "proctored_test";

/**
 * Fans a notification out to every student currently in a class —
 * called right after the teacher-side write that should trigger one
 * (a class material upload, a new proctored test). One row per
 * class_members row, so a class with zero students is a no-op rather
 * than an error. Best-effort: failures are swallowed by the caller
 * (see both call sites) since a notification is a side effect of the
 * real write, not something that should roll it back or fail the
 * teacher's request.
 */
export async function notifyClassMembers(
  classId: string,
  notification: { type: NotificationType; title: string; href: string }
) {
  const supabase = supabaseAdmin();
  const { data: members, error } = await supabase
    .from("class_members")
    .select("student_id")
    .eq("class_id", classId);

  if (error) throw new Error(error.message);
  if (!members || members.length === 0) return;

  const rows = members.map((m) => ({
    student_id: m.student_id,
    class_id: classId,
    type: notification.type,
    title: notification.title,
    href: notification.href,
  }));

  const { error: insertError } = await supabase.from("notifications").insert(rows);
  if (insertError) throw new Error(insertError.message);
}
