import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization, isAuthorized } from "@/lib/classAccess";

const BUCKET = "class-materials";

// DELETE /api/classes/[id]/materials/[materialId] -> teacher/admin
// only, and only with class authorization. Removes the storage object
// first, then the row — if the storage remove fails the DB row is
// left in place rather than pointing at a file that's already gone.
export async function DELETE(req: Request, { params }: { params: { id: string; materialId: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const classAuth = await getClassAuthorization(params.id, user.id, user.role);
  if (!isAuthorized(classAuth)) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }

  const supabase = supabaseAdmin();
  const { data: material } = await supabase
    .from("class_materials")
    .select("id, class_id, file_path")
    .eq("id", params.materialId)
    .eq("class_id", params.id)
    .maybeSingle();

  if (!material) return NextResponse.json({ error: "Material not found." }, { status: 404 });

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([material.file_path]);
  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 });

  const { error } = await supabase.from("class_materials").delete().eq("id", params.materialId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
