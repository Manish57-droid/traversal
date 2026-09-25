import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ProctoredSetWithCount } from "@/types";

// GET    /api/proctored-sets -> every Set (flat, subject-less — a Set
//         is just a named, optional bundle of questions any teacher
//         can freely mix subjects into), each with a live question
//         count. Any signed-in role can read.
// POST   /api/proctored-sets { name } -> teacher/admin only.
// PATCH  /api/proctored-sets { id, name } -> teacher/admin only.
// DELETE /api/proctored-sets { id } -> teacher/admin only. Its
//         questions simply lose that bundle membership — a question's
//         categorization depends only on its Subject, never its Sets.
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("proctored_sets")
    .select("*, proctored_question_sets(count)")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sets: ProctoredSetWithCount[] = (data ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    created_by: s.created_by,
    created_at: s.created_at,
    question_count: s.proctored_question_sets?.[0]?.count ?? 0,
  }));

  return NextResponse.json({ sets });
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("proctored_sets")
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ set: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, name } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("proctored_sets")
    .update({ name: name.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ set: data });
}

export async function DELETE(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("proctored_sets").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
