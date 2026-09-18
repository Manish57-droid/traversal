import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization, isAuthorized } from "@/lib/classAccess";

// GET  /api/aptitude/tests?classId=xxx -> list Aptitude Test Mode
//       tests assigned to a class, with a question_count. Teacher/
//       admin only, and only if authorized on that specific class.
//       Unlike Proctored Tests, a test has no class_id of its own —
//       "assigned to this class" means an aptitude_assignments row
//       links the two, mirroring the DSA question_set/assignment model.
// POST /api/aptitude/tests { class_id, name, description?, category?,
//       time_limit_minutes, negative_marking_fraction?, due_date?,
//       question_ids: string[] }
//       -> creates the test, its ordered question junction rows, and
//       the assignment to class_id, all in one call (this UI always
//       creates a test in the context of assigning it to one class).
export async function GET(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  if (!classId) return NextResponse.json({ error: "classId is required." }, { status: 400 });

  const classAuth = await getClassAuthorization(classId, user.id, user.role);
  if (!isAuthorized(classAuth)) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }

  const supabase = supabaseAdmin();
  const { data: assignments, error } = await supabase
    .from("aptitude_assignments")
    .select("id, due_date, aptitude_tests(*, aptitude_test_questions(question_id))")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tests = (assignments ?? [])
    .map((a: any) => a.aptitude_tests)
    .filter(Boolean)
    .map((t: any, i: number) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      time_limit_minutes: t.time_limit_minutes,
      negative_marking_fraction: t.negative_marking_fraction,
      created_by: t.created_by,
      created_at: t.created_at,
      results_released: t.results_released,
      question_count: t.aptitude_test_questions?.length ?? 0,
      due_date: assignments![i].due_date,
      assignment_id: assignments![i].id,
    }));

  return NextResponse.json({ tests });
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { class_id, name, description, category, time_limit_minutes, negative_marking_fraction, due_date, question_ids } =
    body ?? {};

  if (!class_id) return NextResponse.json({ error: "class_id is required." }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const timeLimit = Number(time_limit_minutes);
  if (!Number.isInteger(timeLimit) || timeLimit <= 0) {
    return NextResponse.json({ error: "time_limit_minutes must be a positive integer." }, { status: 400 });
  }
  if (!Array.isArray(question_ids) || question_ids.length === 0) {
    return NextResponse.json({ error: "At least one question is required." }, { status: 400 });
  }

  const classAuth = await getClassAuthorization(class_id, user.id, user.role);
  if (!isAuthorized(classAuth)) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }

  const supabase = supabaseAdmin();
  const { data: test, error: testError } = await supabase
    .from("aptitude_tests")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      category: category || null,
      time_limit_minutes: timeLimit,
      negative_marking_fraction: negative_marking_fraction !== undefined ? Number(negative_marking_fraction) : 0,
      created_by: user.id,
    })
    .select()
    .single();

  if (testError) return NextResponse.json({ error: testError.message }, { status: 500 });

  const rows = (question_ids as string[]).map((question_id, i) => ({
    test_id: test.id,
    question_id,
    position: i,
  }));
  const { error: itemsError } = await supabase.from("aptitude_test_questions").insert(rows);
  if (itemsError) {
    await supabase.from("aptitude_tests").delete().eq("id", test.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const { error: assignError } = await supabase.from("aptitude_assignments").insert({
    test_id: test.id,
    class_id,
    assigned_by: user.id,
    due_date: due_date || null,
  });
  if (assignError) {
    await supabase.from("aptitude_tests").delete().eq("id", test.id);
    return NextResponse.json({ error: assignError.message }, { status: 500 });
  }

  return NextResponse.json({ test }, { status: 201 });
}
