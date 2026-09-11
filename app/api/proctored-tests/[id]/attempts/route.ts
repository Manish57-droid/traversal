import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization, isAuthorized, isClassMember } from "@/lib/classAccess";
import { remainingSeconds, finalizeAttempt } from "@/lib/proctoredScoring";
import type { ProctoredViolationType } from "@/types";

async function loadTest(testId: string) {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("proctored_tests")
    .select("*, classes(name)")
    .eq("id", testId)
    .maybeSingle();
  return data;
}

async function questionsForTest(testId: string) {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("proctored_test_questions")
    .select("position, proctored_questions(id, prompt, options, difficulty)")
    .eq("test_id", testId)
    .order("position", { ascending: true });
  return (data ?? []).map((r: any) => r.proctored_questions).filter(Boolean);
}

// Re-checks expiry every time an attempt is read, so a stale reload
// (or a client that never got to force-submit) is still closed out
// server-side the moment anyone looks at it again.
async function refreshIfExpired(attempt: any, test: any) {
  if (attempt.status !== "in_progress") return attempt;
  const remaining = remainingSeconds(attempt.started_at, test.time_limit_minutes);
  if (remaining > 0) return attempt;
  const result = await finalizeAttempt(attempt, test);
  return { ...attempt, ...result };
}

// GET /api/proctored-tests/[id]/attempts
//   Student: returns their own single in-progress/finished attempt,
//     the server-computed remaining_seconds, and the sanitized
//     question list (no correct_option/explanation) — used for the
//     take-test screen's initial load and its periodic timer resync.
//   Teacher/admin: returns every attempt for the test plus a
//     violation-type breakdown per attempt (the audit trail view).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const test = await loadTest(params.id);
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const supabase = supabaseAdmin();

  if (user.role === "student") {
    const member = await isClassMember(test.class_id, user.id);
    if (!member) return NextResponse.json({ error: "Test not found." }, { status: 404 });

    const { data: attempt } = await supabase
      .from("proctored_test_attempts")
      .select("*")
      .eq("test_id", test.id)
      .eq("student_id", user.id)
      .maybeSingle();

    if (!attempt) {
      return NextResponse.json({ error: "Start the test first." }, { status: 404 });
    }

    const fresh = await refreshIfExpired(attempt, test);
    const questions = await questionsForTest(test.id);

    return NextResponse.json({
      attempt: {
        id: fresh.id,
        status: fresh.status,
        answers: fresh.answers,
        violation_count: fresh.violation_count,
        score: fresh.score,
        total_questions: fresh.total_questions,
        started_at: fresh.started_at,
      },
      remaining_seconds: remainingSeconds(fresh.started_at, test.time_limit_minutes),
      test: {
        id: test.id,
        name: test.name,
        class_name: test.classes?.name ?? "",
        time_limit_minutes: test.time_limit_minutes,
        max_violations_before_autosubmit: test.max_violations_before_autosubmit,
        require_camera: test.require_camera,
        require_mic: test.require_mic,
      },
      student_name: user.full_name || user.email,
      questions,
    });
  }

  const classAuth = await getClassAuthorization(test.class_id, user.id, user.role);
  if (!isAuthorized(classAuth)) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const { data: attempts, error } = await supabase
    .from("proctored_test_attempts")
    .select("*, users(full_name, email)")
    .eq("test_id", test.id)
    .order("started_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const attemptIds = (attempts ?? []).map((a: any) => a.id);
  const { data: violations } = attemptIds.length
    ? await supabase.from("proctored_violations").select("attempt_id, violation_type").in("attempt_id", attemptIds)
    : { data: [] };

  const breakdownByAttempt: Record<string, Partial<Record<ProctoredViolationType, number>>> = {};
  for (const v of violations ?? []) {
    const bucket = (breakdownByAttempt[v.attempt_id] ??= {});
    bucket[v.violation_type as ProctoredViolationType] = (bucket[v.violation_type as ProctoredViolationType] ?? 0) + 1;
  }

  const shaped = (attempts ?? []).map((a: any) => ({
    attempt_id: a.id,
    student_id: a.student_id,
    student_name: a.users?.full_name || a.users?.email || "Unknown",
    student_email: a.users?.email ?? "",
    status: a.status,
    score: a.score,
    total_questions: a.total_questions,
    violation_count: a.violation_count,
    started_at: a.started_at,
    submitted_at: a.submitted_at,
    violations_by_type: breakdownByAttempt[a.id] ?? {},
  }));

  return NextResponse.json({ attempts: shaped });
}

// POST /api/proctored-tests/[id]/attempts -> start a new attempt, or
// return the existing one (in progress or already finished) if the
// student already has one — the unique (test_id, student_id)
// constraint is the actual guarantee against double-attempts; this
// just makes the "Start Test" click idempotent/resumable.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const test = await loadTest(params.id);
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const member = await isClassMember(test.class_id, user.id);
  if (!member) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const supabase = supabaseAdmin();
  let { data: attempt } = await supabase
    .from("proctored_test_attempts")
    .select("*")
    .eq("test_id", test.id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!attempt) {
    const { data: created, error } = await supabase
      .from("proctored_test_attempts")
      .insert({ test_id: test.id, student_id: user.id, status: "in_progress" })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    attempt = created;
  } else {
    attempt = await refreshIfExpired(attempt, test);
  }

  const questions = await questionsForTest(test.id);

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      status: attempt.status,
      answers: attempt.answers,
      violation_count: attempt.violation_count,
      score: attempt.score,
      total_questions: attempt.total_questions,
      started_at: attempt.started_at,
    },
    remaining_seconds: remainingSeconds(attempt.started_at, test.time_limit_minutes),
    test: {
      id: test.id,
      name: test.name,
      class_name: test.classes?.name ?? "",
      time_limit_minutes: test.time_limit_minutes,
      max_violations_before_autosubmit: test.max_violations_before_autosubmit,
      require_camera: test.require_camera,
      require_mic: test.require_mic,
    },
    student_name: user.full_name || user.email,
    questions,
  });
}
