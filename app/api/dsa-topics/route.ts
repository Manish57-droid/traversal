import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CACHE_TAGS, SHARED_LIST_REVALIDATE_SECONDS, invalidate } from "@/lib/cache";
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
// Cached per `includeTeacherOnly` (the argument is part of the cache
// key), so students never get the teacher list served from cache.
// Throws on error so a failed query is never cached.
const getTopics = unstable_cache(
  async (includeTeacherOnly: boolean): Promise<DsaTopicWithCount[]> => {
    let query = supabaseAdmin().from("dsa_topics").select("*, questions(count)").order("name", { ascending: true });
    if (!includeTeacherOnly) query = query.eq("teacher_only", false);
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      teacher_only: t.teacher_only ?? false,
      created_by: t.created_by,
      created_at: t.created_at,
      question_count: t.questions?.[0]?.count ?? 0,
    }));
  },
  ["dsa-topics"],
  { tags: [CACHE_TAGS.dsaTopics], revalidate: SHARED_LIST_REVALIDATE_SECONDS }
);

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const topics = await getTopics(user.role !== "student");
    return NextResponse.json({ topics });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
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
  invalidate(CACHE_TAGS.dsaTopics);
  return NextResponse.json({ topic: data }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  // Deleting a teacher-only folder would uncategorize its questions,
  // silently publishing them to every student — refuse instead.
  const { data: topic } = await supabase.from("dsa_topics").select("teacher_only").eq("id", id).maybeSingle();
  if (topic?.teacher_only) {
    return NextResponse.json({ error: "Teacher-only folders can't be deleted — their questions would become visible to students." }, { status: 400 });
  }

  const { error: uncatError } = await supabase
    .from("questions")
    .update({ topic_id: null, topic: null })
    .eq("topic_id", id);
  if (uncatError) return NextResponse.json({ error: uncatError.message }, { status: 500 });
  // Counts already moved, even if the delete below fails.
  invalidate(CACHE_TAGS.dsaTopics);

  const { error } = await supabase.from("dsa_topics").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidate(CACHE_TAGS.dsaTopics);

  return NextResponse.json({ deleted: true });
}
