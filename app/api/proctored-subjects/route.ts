import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ProctoredSetWithCount, ProctoredSubjectWithSets } from "@/types";

// GET    /api/proctored-subjects -> every subject with its sets, each
//         set carrying a live question count. Any signed-in role can
//         read; only teacher/admin can write. Shared bank, not
//         class-scoped — same spirit as DSA/Aptitude.
// POST   /api/proctored-subjects { name } -> teacher/admin only.
// PATCH  /api/proctored-subjects { id, name } -> teacher/admin only.
// DELETE /api/proctored-subjects { id } -> teacher/admin only. Cascades
//         to its sets, which flag their questions needs_categorization
//         before set_id goes null (see migration 0012's trigger).
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const [{ data: subjects, error: subjErr }, { data: sets, error: setErr }] = await Promise.all([
    supabase.from("proctored_subjects").select("*").order("name", { ascending: true }),
    supabase.from("proctored_sets").select("*, proctored_questions(count)").order("name", { ascending: true }),
  ]);

  if (subjErr) return NextResponse.json({ error: subjErr.message }, { status: 500 });
  if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 });

  const setsBySubject = new Map<string, ProctoredSetWithCount[]>();
  for (const s of (sets ?? []) as any[]) {
    const withCount: ProctoredSetWithCount = {
      id: s.id,
      subject_id: s.subject_id,
      name: s.name,
      created_by: s.created_by,
      created_at: s.created_at,
      question_count: s.proctored_questions?.[0]?.count ?? 0,
    };
    const list = setsBySubject.get(s.subject_id) ?? [];
    list.push(withCount);
    setsBySubject.set(s.subject_id, list);
  }

  const result: ProctoredSubjectWithSets[] = (subjects ?? []).map((subj: any) => ({
    id: subj.id,
    name: subj.name,
    created_by: subj.created_by,
    created_at: subj.created_at,
    sets: setsBySubject.get(subj.id) ?? [],
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
