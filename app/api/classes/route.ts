import { NextResponse } from "next/server";
import { requireRole, getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthorizedClassIds } from "@/lib/classAccess";

// GET  /api/classes         -> classes the signed-in teacher can manage
//                               (owner or approved collaborator; all
//                               classes for admin). For "every class
//                               in the system regardless of access",
//                               see GET /api/classes/browse instead.
// POST /api/classes { name }-> create a class, returns its join_code
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const classIds = await getAuthorizedClassIds(user.id, user.role);

  if (classIds !== null && classIds.length === 0) {
    return NextResponse.json({ classes: [] });
  }

  let query = supabase.from("classes").select("*, class_members(count)");
  if (classIds !== null) query = query.in("id", classIds);
  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ classes: data });
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Class name is required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("classes")
    .insert({ name: name.trim(), teacher_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ class: data }, { status: 201 });
}
