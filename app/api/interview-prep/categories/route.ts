import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CACHE_TAGS, SHARED_LIST_REVALIDATE_SECONDS, invalidate } from "@/lib/cache";
import type { InterviewCategoryWithCount } from "@/types";

// GET    /api/interview-prep/categories -> every category, ordered by
//         display_order, with a live question count. Any signed-in
//         role can read (students browse, teachers/admin author).
// POST   /api/interview-prep/categories { name, slug, description?, icon, display_order? }
//         -> teacher/admin only.
// PATCH  /api/interview-prep/categories { id, ...fields } -> teacher/admin only.
// DELETE /api/interview-prep/categories { id } -> teacher/admin only.
// Throws on error so a failed query is never cached.
const getCategories = unstable_cache(
  async (): Promise<InterviewCategoryWithCount[]> => {
    const { data, error } = await supabaseAdmin()
      .from("interview_categories")
      .select("*, interview_questions(count)")
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);

    return (data ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      display_order: c.display_order,
      created_at: c.created_at,
      question_count: c.interview_questions?.[0]?.count ?? 0,
    }));
  },
  ["interview-categories"],
  { tags: [CACHE_TAGS.interviewCategories], revalidate: SHARED_LIST_REVALIDATE_SECONDS }
);

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const categories = await getCategories();
    return NextResponse.json({ categories });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, slug, description, icon, display_order } = await req.json();
  if (!name?.trim() || !slug?.trim() || !icon?.trim()) {
    return NextResponse.json({ error: "name, slug, and icon are required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("interview_categories")
    .insert({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description?.trim() || null,
      icon: icon.trim(),
      display_order: Number.isFinite(display_order) ? display_order : 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidate(CACHE_TAGS.interviewCategories);
  return NextResponse.json({ category: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, name, slug, description, icon, display_order } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("interview_categories")
    .update({
      ...(name?.trim() ? { name: name.trim() } : {}),
      ...(slug?.trim() ? { slug: slug.trim().toLowerCase() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      ...(icon?.trim() ? { icon: icon.trim() } : {}),
      ...(Number.isFinite(display_order) ? { display_order } : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidate(CACHE_TAGS.interviewCategories);
  return NextResponse.json({ category: data });
}

export async function DELETE(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("interview_categories").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidate(CACHE_TAGS.interviewCategories);
  return NextResponse.json({ deleted: true });
}
