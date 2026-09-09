import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization } from "@/lib/classAccess";

// DELETE /api/classes/:id/collaborators/:teacherId
// Allowed for: the class owner, admin, or the collaborator removing
// themselves ("Leave class"). NOT allowed for one collaborator to
// remove another — only the owner/admin can do that.
export async function DELETE(req: Request, { params }: { params: { id: string; teacherId: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const auth = await getClassAuthorization(params.id, user.id, user.role);
  const isSelfRemoval = user.id === params.teacherId;

  if (auth !== "owner" && auth !== "admin" && !isSelfRemoval) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("class_collaborators")
    .delete()
    .eq("class_id", params.id)
    .eq("teacher_id", params.teacherId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ removed: true });
}
