import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization, isAuthorized, isClassMember } from "@/lib/classAccess";
import { getSectionsWithQuestions } from "@/lib/proctoredSections";

// GET /api/proctored-tests/[id] -> test detail.
//   Student: must be a member of the test's class; response includes
//     `my_attempt` (status/score summary, or null if never started).
//   Teacher/admin: must be authorized on the test's class (owner/
//     collaborator/admin); response includes question_count and the
//     section list (subject/set-count/question-count per section).
// PATCH /api/proctored-tests/[id] { results_released } -> teacher/admin
//   only, same class-scoped authorization as creating a test.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const { data: test, error } = await supabase.from("proctored_tests").select("*").eq("id", params.id).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const sectionsWithQuestions = await getSectionsWithQuestions(test.id);
  const questionCount = sectionsWithQuestions.reduce((sum, s) => sum + s.questions.length, 0);

  // Resolved values (the actual number that applies, not "inherited")
  // — what the rules screen and the take screen's section tabs need;
  // shown to both students and teachers alike, unlike subject_id/set
  // internals which stay teacher-only below.
  const sectionSummaries = sectionsWithQuestions
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      id: s.id,
      name: s.name,
      position: s.position,
      time_limit_minutes: s.time_limit_minutes,
      resolved_negative_marking_fraction: s.negative_marking_fraction ?? test.negative_marking_fraction,
      calculator_enabled: s.calculator_enabled,
      question_count: s.questions.length,
    }));

  const base = {
    id: test.id,
    class_id: test.class_id,
    name: test.name,
    description: test.description,
    time_limit_minutes: test.time_limit_minutes,
    negative_marking_fraction: test.negative_marking_fraction,
    max_violations_before_autosubmit: test.max_violations_before_autosubmit,
    require_camera: test.require_camera,
    require_mic: test.require_mic,
    results_released: test.results_released,
    timer_mode: test.timer_mode,
    allow_free_section_navigation: test.allow_free_section_navigation,
    question_count: questionCount,
  };

  if (user.role === "student") {
    const member = await isClassMember(test.class_id, user.id);
    if (!member) return NextResponse.json({ error: "Test not found." }, { status: 404 });

    const { data: attempt } = await supabase
      .from("proctored_test_attempts")
      .select("id, status, score, total_questions, violation_count")
      .eq("test_id", test.id)
      .eq("student_id", user.id)
      .maybeSingle();

    return NextResponse.json({ test: base, my_attempt: attempt ?? null, sections: sectionSummaries });
  }

  const classAuth = await getClassAuthorization(test.class_id, user.id, user.role);
  if (!isAuthorized(classAuth)) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const sections = sectionsWithQuestions.map((s) => ({
    id: s.id,
    name: s.name,
    subject_id: s.subject_id,
    position: s.position,
    time_limit_minutes: s.time_limit_minutes,
    negative_marking_fraction: s.negative_marking_fraction,
    calculator_enabled: s.calculator_enabled,
    question_count: s.questions.length,
  }));

  return NextResponse.json({ test: { ...base, created_by: test.created_by, created_at: test.created_at }, sections });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { results_released } = await req.json();
  if (typeof results_released !== "boolean") {
    return NextResponse.json({ error: "results_released must be a boolean." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: test } = await supabase.from("proctored_tests").select("class_id").eq("id", params.id).maybeSingle();
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const classAuth = await getClassAuthorization(test.class_id, user.id, user.role);
  if (!isAuthorized(classAuth)) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const { data: updated, error } = await supabase
    .from("proctored_tests")
    .update({ results_released })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ test: updated });
}
