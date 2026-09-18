import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization, isAuthorized, isClassMember } from "@/lib/classAccess";

async function assignedClassIds(testId: string) {
  const supabase = supabaseAdmin();
  const { data } = await supabase.from("aptitude_assignments").select("class_id").eq("test_id", testId);
  return (data ?? []).map((a) => a.class_id);
}

// GET /api/aptitude/tests/[id] -> test detail.
//   Student: must belong to a class this test is assigned to; response
//     includes `my_attempt` (status/score summary, or null).
//   Teacher/admin: must be authorized on at least one class this test
//     is assigned to (a test created from one class panel is normally
//     assigned to just that one).
// PATCH /api/aptitude/tests/[id] { results_released } -> teacher/admin
//   only, same authorization rule as GET.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const { data: test, error } = await supabase
    .from("aptitude_tests")
    .select("*, aptitude_test_questions(question_id)")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const base = {
    id: test.id,
    name: test.name,
    description: test.description,
    category: test.category,
    time_limit_minutes: test.time_limit_minutes,
    negative_marking_fraction: test.negative_marking_fraction,
    results_released: test.results_released,
    question_count: test.aptitude_test_questions?.length ?? 0,
  };

  if (user.role === "student") {
    const classIds = await assignedClassIds(test.id);
    const memberships = await Promise.all(classIds.map((cid) => isClassMember(cid, user.id)));
    if (!memberships.some(Boolean)) return NextResponse.json({ error: "Test not found." }, { status: 404 });

    const { data: attempt } = await supabase
      .from("aptitude_test_attempts")
      .select("id, status, score, total_questions")
      .eq("test_id", test.id)
      .eq("student_id", user.id)
      .maybeSingle();

    return NextResponse.json({ test: base, my_attempt: attempt ?? null });
  }

  const classIds = await assignedClassIds(test.id);
  const auths = await Promise.all(classIds.map((cid) => getClassAuthorization(cid, user.id, user.role)));
  if (!auths.some(isAuthorized)) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  return NextResponse.json({ test: { ...base, created_by: test.created_by, created_at: test.created_at } });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { results_released } = await req.json();
  if (typeof results_released !== "boolean") {
    return NextResponse.json({ error: "results_released must be a boolean." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: test } = await supabase.from("aptitude_tests").select("id").eq("id", params.id).maybeSingle();
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const classIds = await assignedClassIds(params.id);
  const auths = await Promise.all(classIds.map((cid) => getClassAuthorization(cid, user.id, user.role)));
  if (!auths.some(isAuthorized)) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const { data: updated, error } = await supabase
    .from("aptitude_tests")
    .update({ results_released })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ test: updated });
}
