import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CACHE_TAGS, SHARED_LIST_REVALIDATE_SECONDS, invalidate } from "@/lib/cache";
import type { CompanyWithCount } from "@/types";

// GET    /api/companies -> every company with a live question count.
//         Any signed-in role can read; only teacher/admin can write.
//         Shared bank, not class-scoped — same spirit as dsa_topics.
// POST   /api/companies { name } -> teacher/admin only.
// PATCH  /api/companies { id, name } -> teacher/admin only.
// DELETE /api/companies { id } -> teacher/admin only. Its questions
//         just lose that tag (question_companies cascades) rather than
//         being deleted or blocked.
// Throws on error so a failed query is never cached.
const getCompanies = unstable_cache(
  async (): Promise<CompanyWithCount[]> => {
    const { data, error } = await supabaseAdmin()
      .from("companies")
      .select("id, name, question_companies(count)")
      .order("name");
    if (error) throw new Error(error.message);

    return (data ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      question_count: c.question_companies?.[0]?.count ?? 0,
    }));
  },
  ["companies"],
  { tags: [CACHE_TAGS.companies], revalidate: SHARED_LIST_REVALIDATE_SECONDS }
);

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const companies = await getCompanies();
    return NextResponse.json({ companies });
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
    .from("companies")
    .insert({ name: name.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidate(CACHE_TAGS.companies);
  return NextResponse.json({ company: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, name } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("companies")
    .update({ name: name.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidate(CACHE_TAGS.companies);
  return NextResponse.json({ company: data });
}

export async function DELETE(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("companies").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidate(CACHE_TAGS.companies);
  return NextResponse.json({ deleted: true });
}
