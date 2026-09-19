import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// DELETE /api/student/classes/[id] -> the signed-in student leaves a
// class they belong to (deletes their own class_members row only —
// their assignment/attempt history isn't touched, same as a teacher
// collaborator leaving doesn't delete anything). No-op if they weren't
// a member.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["student"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("class_members")
    .delete()
    .eq("class_id", params.id)
    .eq("student_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ left: true });
}
