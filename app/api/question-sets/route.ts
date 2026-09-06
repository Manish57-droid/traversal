import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET  /api/question-sets  -> list all sets with their question ids
//                              (any signed-in role can read, e.g. a
//                              student viewing what a set contains)
// POST /api/question-sets { name, description?, question_ids? }
//      -> teacher/admin creates a named set, optionally pre-loaded
//         with questions from the bank
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("question_sets")
    .select("*, question_set_items(question_id, questions(*))")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question_sets: data });
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, description, question_ids } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Set name is required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: set, error } = await supabase
    .from("question_sets")
    .insert({ name: name.trim(), description: description || null, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(question_ids) && question_ids.length) {
    const rows = question_ids.map((question_id: string) => ({
      question_set_id: set.id,
      question_id,
    }));
    await supabase.from("question_set_items").insert(rows);
  }

  return NextResponse.json({ question_set: set }, { status: 201 });
}
