import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// PATCH /api/proctored-sets/[id]/questions { question_ids: string[] }
// -> teacher/admin only. Replaces this Set's full question membership
// with exactly the given list — the Set-side counterpart to PATCHing
// a single question's set_ids from the question form, for picking
// many existing bank questions into a Set at once.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { question_ids } = await req.json();
  if (!Array.isArray(question_ids)) {
    return NextResponse.json({ error: "question_ids must be an array." }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: set } = await supabase.from("proctored_sets").select("id").eq("id", params.id).maybeSingle();
  if (!set) return NextResponse.json({ error: "Set not found." }, { status: 404 });

  const { error: deleteError } = await supabase.from("proctored_question_sets").delete().eq("set_id", params.id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  const ids = (question_ids as string[]).filter(Boolean);
  if (ids.length > 0) {
    const { error: insertError } = await supabase
      .from("proctored_question_sets")
      .insert(ids.map((question_id) => ({ question_id, set_id: params.id })));
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ updated: true, question_count: ids.length });
}
