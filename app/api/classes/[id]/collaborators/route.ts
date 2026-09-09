import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization, isAuthorized } from "@/lib/classAccess";

// GET /api/classes/:id/collaborators -> approved collaborators on this
// class (not the owner — the owner is classes.teacher_id, surfaced
// separately). Anyone authorized for the class (owner/collaborator/
// admin) can see who else has access.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const auth = await getClassAuthorization(params.id, user.id, user.role);
  if (!isAuthorized(auth)) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("class_collaborators")
    .select("teacher_id, added_at, users(full_name, email)")
    .eq("class_id", params.id)
    .order("added_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const collaborators = (data ?? []).map((c: any) => ({
    teacher_id: c.teacher_id,
    added_at: c.added_at,
    full_name: c.users?.full_name ?? null,
    email: c.users?.email ?? "",
  }));

  return NextResponse.json({ collaborators, authorization: auth });
}
