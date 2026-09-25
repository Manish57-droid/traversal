import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ProctoredSubjectWithCount } from "@/types";

// GET    /api/proctored-subjects -> every subject with its own direct
//         question count. Any signed-in role can read; only
//         teacher/admin can write. Shared bank, not class-scoped —
//         same spirit as DSA/Aptitude. Subjects no longer nest Sets —
//         a Set is an independent, optional bundle (see
//         /api/proctored-sets) that can freely mix subjects.
// POST   /api/proctored-subjects { name } -> teacher/admin only.
// PATCH  /api/proctored-subjects { id, name } -> teacher/admin only.
// DELETE /api/proctored-subjects { id } -> teacher/admin only. Its
//         questions are flagged needs_categorization before subject_id
//         goes null (see migration 0025's trigger).
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const { data: subjects, error } = await supabase
    .from("proctored_subjects")
    .select("*, proctored_questions(count)")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result: ProctoredSubjectWithCount[] = (subjects ?? []).map((subj: any) => ({
    id: subj.id,
    name: subj.name,
    created_by: subj.created_by,
    created_at: subj.created_at,
    question_count: subj.proctored_questions?.[0]?.count ?? 0,
  }));

  return NextResponse.json({ subjects: result });
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("proctored_subjects")
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subject: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, name } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("proctored_subjects")
    .update({ name: name.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subject: data });
}

export async function DELETE(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("proctored_subjects").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
