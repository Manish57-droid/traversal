import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CACHE_TAGS, SHARED_LIST_REVALIDATE_SECONDS, invalidate } from "@/lib/cache";
import type { AptitudeCategory, AptitudeTopicWithCount } from "@/types";

// GET    /api/aptitude-topics -> every topic (all categories) with a
//         live question count. Any signed-in role can read; only
//         teacher/admin can write.
// POST   /api/aptitude-topics { category, name } -> teacher/admin only.
// DELETE /api/aptitude-topics { id } -> teacher/admin only. Unlike a
//         DSA topic, this is BLOCKED while any question still uses it:
//         aptitude_questions.topic is NOT NULL (a topic has always
//         been mandatory there), so there's no "uncategorized" state
//         to fall back to — recategorize those questions first.
// Throws on error so a failed query is never cached.
const getTopics = unstable_cache(
  async (): Promise<AptitudeTopicWithCount[]> => {
    const { data, error } = await supabaseAdmin()
      .from("aptitude_topics")
      .select("*, aptitude_questions(count)")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);

    return (data ?? []).map((t: any) => ({
      id: t.id,
      category: t.category,
      name: t.name,
      created_by: t.created_by,
      created_at: t.created_at,
      question_count: t.aptitude_questions?.[0]?.count ?? 0,
    }));
  },
  ["aptitude-topics"],
  { tags: [CACHE_TAGS.aptitudeTopics], revalidate: SHARED_LIST_REVALIDATE_SECONDS }
);

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const topics = await getTopics();
    return NextResponse.json({ topics });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { category, name } = await req.json();
  const validCategories: AptitudeCategory[] = ["quant", "logical", "verbal"];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: "A valid category is required." }, { status: 400 });
  }
  if (!name?.trim()) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("aptitude_topics")
    .insert({ category, name: name.trim(), created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidate(CACHE_TAGS.aptitudeTopics);
  return NextResponse.json({ topic: data }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { count } = await supabase
    .from("aptitude_questions")
    .select("id", { count: "exact", head: true })
    .eq("topic_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `${count} question${count === 1 ? "" : "s"} still use this topic — recategorize them first.` },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("aptitude_topics").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidate(CACHE_TAGS.aptitudeTopics);

  return NextResponse.json({ deleted: true });
}
