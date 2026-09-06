import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// POST   /api/question-sets/:id/items { question_id } -> add one question
// DELETE /api/question-sets/:id/items { question_id } -> remove one question
// Teacher/admin only.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { question_id } = await req.json();
  if (!question_id) {
    return NextResponse.json({ error: "question_id is required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("question_set_items")
    .insert({ question_set_id: params.id, question_id });

  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ added: true }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { question_id } = await req.json();
  if (!question_id) {
    return NextResponse.json({ error: "question_id is required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("question_set_items")
    .delete()
    .eq("question_set_id", params.id)
    .eq("question_id", question_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ removed: true });
}
