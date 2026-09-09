import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET /api/classes/browse -> every class in the system, regardless of
// the requester's access, with just enough info to browse: name,
// owner name, student count, and the requester's own relationship to
// each one ('owner' | 'collaborator' | 'admin' | 'pending' | 'none').
// Roster/content/analytics are NOT included here — that's the whole
// point of this endpoint vs. GET /api/classes or /api/teacher/analytics,
// which require actual access.
export async function GET() {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();

  // `users` must be disambiguated here: PostgREST can reach `users` from
  // `classes` three ways now (the direct `teacher_id` FK, plus two
  // many-to-many paths through the `class_members` and
  // `class_collaborators` junction tables), so a bare `users(...)` embed
  // is ambiguous and errors with PGRST201. We specifically want the
  // owner, i.e. the direct FK.
  const { data: classes, error } = await supabase
    .from("classes")
    .select("id, name, teacher_id, users!classes_teacher_id_fkey(full_name, email), class_members(count)")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const [{ data: collabRows }, { data: pendingRows }] = await Promise.all([
    supabase.from("class_collaborators").select("class_id").eq("teacher_id", user.id),
    supabase.from("class_access_requests").select("class_id").eq("requesting_teacher_id", user.id).eq("status", "pending"),
  ]);
  const collabClassIds = new Set((collabRows ?? []).map((r) => r.class_id));
  const pendingClassIds = new Set((pendingRows ?? []).map((r) => r.class_id));

  const result = (classes ?? []).map((c: any) => {
    let relationship: "owner" | "collaborator" | "admin" | "pending" | "none";
    if (user.role === "admin") relationship = "admin";
    else if (c.teacher_id === user.id) relationship = "owner";
    else if (collabClassIds.has(c.id)) relationship = "collaborator";
    else if (pendingClassIds.has(c.id)) relationship = "pending";
    else relationship = "none";

    return {
      id: c.id,
      name: c.name,
      owner_name: c.users?.full_name || c.users?.email || "Unknown",
      student_count: c.class_members?.[0]?.count ?? 0,
      relationship,
    };
  });

  return NextResponse.json({ classes: result });
}
