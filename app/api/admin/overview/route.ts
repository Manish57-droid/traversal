import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { AdminActivityItem, AdminOverviewStats } from "@/types";

const ROLE_LABEL: Record<string, string> = { student: "Student", teacher: "Teacher", admin: "Admin" };

// GET /api/admin/overview -> platform-wide stat counts + a merged
// recent-activity feed (role changes + class access requests, any
// status). Admin only.
export async function GET() {
  const admin = await requireRole(["admin"]).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();

  const [
    { count: teacherCount },
    { count: studentCount },
    { count: classCount },
    { count: pendingSignups },
    { count: pendingAccessRequests },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "teacher"),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("classes").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("class_access_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const stats: AdminOverviewStats = {
    teacherCount: teacherCount ?? 0,
    studentCount: studentCount ?? 0,
    classCount: classCount ?? 0,
    pendingSignups: pendingSignups ?? 0,
    pendingAccessRequests: pendingAccessRequests ?? 0,
  };

  // role_change_log has two FKs to users (target_user_id, changed_by)
  // — same PGRST201 ambiguity as class_access_requests elsewhere in
  // this app, so both embeds need the explicit constraint-name hint.
  const { data: roleLogs } = await supabase
    .from("role_change_log")
    .select(
      "id, previous_role, new_role, changed_at, target:users!role_change_log_target_user_id_fkey(full_name, email), changed_by_user:users!role_change_log_changed_by_fkey(full_name, email)"
    )
    .order("changed_at", { ascending: false })
    .limit(10);

  const { data: accessRequests } = await supabase
    .from("class_access_requests")
    .select(
      "id, status, requested_at, resolved_at, classes(name), requester:users!class_access_requests_requesting_teacher_id_fkey(full_name, email), resolver:users!class_access_requests_resolved_by_fkey(full_name, email)"
    )
    .order("requested_at", { ascending: false })
    .limit(10);

  const roleActivity: AdminActivityItem[] = (roleLogs ?? []).map((r: any) => ({
    id: `role-${r.id}`,
    description: `${r.changed_by_user?.full_name || r.changed_by_user?.email || "Someone"} changed ${
      r.target?.full_name || r.target?.email || "a user"
    }'s role: ${ROLE_LABEL[r.previous_role]} → ${ROLE_LABEL[r.new_role]}`,
    timestamp: r.changed_at,
  }));

  const accessActivity: AdminActivityItem[] = (accessRequests ?? []).map((r: any) => {
    const requesterName = r.requester?.full_name || r.requester?.email || "Someone";
    const className = r.classes?.name || "a class";
    const resolverName = r.resolver?.full_name || r.resolver?.email;
    let description: string;
    if (r.status === "pending") {
      description = `${requesterName} requested access to ${className}`;
    } else if (r.status === "approved") {
      description = `${resolverName || "An admin"} approved ${requesterName}'s access request to ${className}`;
    } else {
      description = `${resolverName || "An admin"} rejected ${requesterName}'s access request to ${className}`;
    }
    return {
      id: `access-${r.id}`,
      description,
      timestamp: r.resolved_at || r.requested_at,
    };
  });

  const recentActivity = [...roleActivity, ...accessActivity].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return NextResponse.json({ stats, recentActivity });
}
