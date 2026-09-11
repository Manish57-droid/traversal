import { supabaseAdmin } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export type ClassAuthorization = "owner" | "collaborator" | "admin" | "none";

/**
 * Single source of truth for "can this user manage this class?" — the
 * owner (classes.teacher_id) and any approved collaborator
 * (class_collaborators) have equal rights; admin always does too.
 * Every class-scoped route calls this instead of a raw
 * `teacher_id = user.id` / `created_by = user.id` comparison, so the
 * collaboration model can't quietly drift out of sync route by route.
 */
export async function getClassAuthorization(
  classId: string,
  userId: string,
  userRole: UserRole
): Promise<ClassAuthorization> {
  if (userRole === "admin") return "admin";

  const supabase = supabaseAdmin();
  const { data: klass } = await supabase.from("classes").select("teacher_id").eq("id", classId).maybeSingle();
  if (!klass) return "none";
  if (klass.teacher_id === userId) return "owner";

  const { data: collab } = await supabase
    .from("class_collaborators")
    .select("teacher_id")
    .eq("class_id", classId)
    .eq("teacher_id", userId)
    .maybeSingle();

  return collab ? "collaborator" : "none";
}

export function isAuthorized(auth: ClassAuthorization): boolean {
  return auth !== "none";
}

/**
 * Student-side equivalent of getClassAuthorization: is this student an
 * enrolled member of the class? Used by student-facing routes (e.g.
 * Proctored Tests) where the caller is never an owner/collaborator,
 * just a class_members row.
 */
export async function isClassMember(classId: string, studentId: string): Promise<boolean> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("class_members")
    .select("student_id")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .maybeSingle();
  return !!data;
}

/**
 * Class ids this user may manage (owner or approved collaborator).
 * Returns `null` for admin, meaning "no filter — every class" rather
 * than an actual (possibly huge) id list; callers should treat `null`
 * as "don't scope the query" and a non-null array (including empty)
 * as an explicit id filter.
 */
export async function getAuthorizedClassIds(userId: string, userRole: UserRole): Promise<string[] | null> {
  if (userRole === "admin") return null;

  const supabase = supabaseAdmin();
  const [{ data: owned }, { data: collabRows }] = await Promise.all([
    supabase.from("classes").select("id").eq("teacher_id", userId),
    supabase.from("class_collaborators").select("class_id").eq("teacher_id", userId),
  ]);

  const ownedIds = (owned ?? []).map((c) => c.id);
  const collabIds = (collabRows ?? []).map((c) => c.class_id);
  return [...new Set([...ownedIds, ...collabIds])];
}
