import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization } from "@/lib/classAccess";

// DELETE /api/classes/:id
// Permanently deletes a class and everything scoped to it (members,
// assignments, attempts, progress — all cascade via FK on classes.id,
// see lib/supabase/schema.sql). Owner or admin only; a collaborator
// can leave a class (see collaborators/:teacherId) but can't delete it.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const auth = await getClassAuthorization(params.id, user.id, user.role);
  if (auth !== "owner" && auth !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("classes").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
