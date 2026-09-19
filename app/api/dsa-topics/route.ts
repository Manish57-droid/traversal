import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { DsaTopicWithCount } from "@/types";

// GET    /api/dsa-topics -> every topic with a live question count.
//         Any signed-in role can read; only teacher/admin can write.
//         Shared bank, not class-scoped — same spirit as
//         proctored_subjects.
// POST   /api/dsa-topics { name } -> teacher/admin only.
// DELETE /api/dsa-topics { id } -> teacher/admin only. Its questions
//         become uncategorized (topic_id AND the denormalized topic
//         text both cleared) rather than being deleted or blocked —
//         same posture as deleting a Proctored Set.
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("dsa_topics")
    .select("*, questions(count)")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const topics: DsaTopicWithCount[] = (data ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    created_by: t.created_by,
    created_at: t.created_at,
    question_count: t.questions?.[0]?.count ?? 0,
  }));

  return NextResponse.json({ topics });
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("dsa_topics")
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ topic: data }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { error: uncatError } = await supabase
    .from("questions")
    .update({ topic_id: null, topic: null })
    .eq("topic_id", id);
  if (uncatError) return NextResponse.json({ error: uncatError.message }, { status: 500 });

  const { error } = await supabase.from("dsa_topics").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
