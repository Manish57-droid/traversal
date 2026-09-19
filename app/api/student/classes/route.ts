import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET /api/student/classes -> every class the signed-in student has
// joined, with the teacher's name and when they joined — powers the
// "My Classes" page, which is also where a student can leave one
// (DELETE /api/student/classes/[id]).
export async function GET() {
  const user = await requireRole(["student"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();

  // `users!classes_teacher_id_fkey` disambiguates the same way
  // GET /api/classes/browse does — PostgREST can otherwise reach
  // `users` from `classes` more than one way.
  const { data, error } = await supabase
    .from("class_members")
    .select("joined_at, classes(id, name, users!classes_teacher_id_fkey(full_name, email))")
    .eq("student_id", user.id)
    .order("joined_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const classes = (data ?? [])
    .filter((r: any) => r.classes)
    .map((r: any) => ({
      id: r.classes.id,
      name: r.classes.name,
      teacher_name: r.classes.users?.full_name || r.classes.users?.email || "Unknown",
      joined_at: r.joined_at,
    }));

  return NextResponse.json({ classes });
}
