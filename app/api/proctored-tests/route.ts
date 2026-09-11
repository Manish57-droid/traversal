import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization, isAuthorized } from "@/lib/classAccess";

// GET  /api/proctored-tests?classId=xxx -> list proctored tests for a
//       class, with a question_count. Teacher/admin only, and only if
//       authorized on that specific class (owner/collaborator/admin).
// POST /api/proctored-tests { class_id, name, description?, time_limit_minutes,
//       negative_marking_fraction?, max_violations_before_autosubmit?,
//       require_camera?, require_mic?, question_ids: string[] }
//       -> creates the test plus its ordered question junction rows.
//       Same class-scoped authorization check as POST /api/assign —
//       without it, any signed-in teacher could create a test under a
//       class they don't own/collaborate on just by knowing its id.
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
  const { data, error } = await supabase
    .from("proctored_tests")
    .select("*, proctored_test_questions(question_id)")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tests = (data ?? []).map((t: any) => ({
    id: t.id,
    class_id: t.class_id,
    name: t.name,
    description: t.description,
    time_limit_minutes: t.time_limit_minutes,
    negative_marking_fraction: t.negative_marking_fraction,
    max_violations_before_autosubmit: t.max_violations_before_autosubmit,
    require_camera: t.require_camera,
    require_mic: t.require_mic,
    created_by: t.created_by,
    created_at: t.created_at,
    results_released: t.results_released,
    question_count: t.proctored_test_questions?.length ?? 0,
  }));

  return NextResponse.json({ tests, authorization: classAuth });
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    class_id,
    name,
    description,
    time_limit_minutes,
    negative_marking_fraction,
    max_violations_before_autosubmit,
    require_camera,
    require_mic,
    question_ids,
  } = body ?? {};

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
    .from("proctored_tests")
    .insert({
      class_id,
      name: name.trim(),
      description: description?.trim() || null,
      time_limit_minutes: timeLimit,
      negative_marking_fraction: negative_marking_fraction !== undefined ? Number(negative_marking_fraction) : 0,
      max_violations_before_autosubmit:
        max_violations_before_autosubmit !== undefined ? Number(max_violations_before_autosubmit) : 3,
      require_camera: !!require_camera,
      require_mic: !!require_mic,
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
  const { error: itemsError } = await supabase.from("proctored_test_questions").insert(rows);
  if (itemsError) {
    await supabase.from("proctored_tests").delete().eq("id", test.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ test }, { status: 201 });
}
