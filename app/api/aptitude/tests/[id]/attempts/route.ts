import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization, isAuthorized, isClassMember } from "@/lib/classAccess";
import { remainingSeconds } from "@/lib/testTiming";
import { finalizeAptitudeAttempt } from "@/lib/aptitudeScoring";

async function loadTest(testId: string) {
  const supabase = supabaseAdmin();
  const { data } = await supabase.from("aptitude_tests").select("*").eq("id", testId).maybeSingle();
  return data;
}

async function assignedClassIds(testId: string) {
  const supabase = supabaseAdmin();
  const { data } = await supabase.from("aptitude_assignments").select("class_id").eq("test_id", testId);
  return (data ?? []).map((a) => a.class_id);
}

async function questionsForTest(testId: string) {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("aptitude_test_questions")
    .select("position, aptitude_questions(id, prompt, options, difficulty)")
    .eq("test_id", testId)
    .order("position", { ascending: true });
  return (data ?? []).map((r: any) => r.aptitude_questions).filter(Boolean);
}

// Re-checks expiry every time an attempt is read, so a stale reload
// is still closed out server-side the moment anyone looks at it again.
async function refreshIfExpired(attempt: any, test: any) {
  if (attempt.status !== "in_progress") return attempt;
  const remaining = remainingSeconds(attempt.started_at, test.time_limit_minutes);
  if (remaining > 0) return attempt;
  const result = await finalizeAptitudeAttempt(attempt, test);
  return { ...attempt, ...result };
}

// GET /api/aptitude/tests/[id]/attempts
//   Student: their own attempt, remaining_seconds, and the sanitized
//     question list — powers the take-test screen.
//   Teacher/admin: every attempt for the test — the results rollup
//     (score, status, time taken per student).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const test = await loadTest(params.id);
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const supabase = supabaseAdmin();

  if (user.role === "student") {
    const classIds = await assignedClassIds(test.id);
    const memberships = await Promise.all(classIds.map((cid) => isClassMember(cid, user.id)));
    if (!memberships.some(Boolean)) return NextResponse.json({ error: "Test not found." }, { status: 404 });

    const { data: attempt } = await supabase
      .from("aptitude_test_attempts")
      .select("*")
      .eq("test_id", test.id)
      .eq("student_id", user.id)
      .maybeSingle();

    if (!attempt) return NextResponse.json({ error: "Start the test first." }, { status: 404 });

    const fresh = await refreshIfExpired(attempt, test);
    const questions = await questionsForTest(test.id);

    return NextResponse.json({
      attempt: {
        id: fresh.id,
        status: fresh.status,
        answers: fresh.answers,
        score: fresh.score,
        total_questions: fresh.total_questions,
        started_at: fresh.started_at,
      },
      remaining_seconds: remainingSeconds(fresh.started_at, test.time_limit_minutes),
      test: {
        id: test.id,
        name: test.name,
        time_limit_minutes: test.time_limit_minutes,
      },
      questions,
    });
  }

  const classIds = await assignedClassIds(test.id);
  const auths = await Promise.all(classIds.map((cid) => getClassAuthorization(cid, user.id, user.role)));
  if (!auths.some(isAuthorized)) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const { data: attempts, error } = await supabase
    .from("aptitude_test_attempts")
    .select("*, users(full_name, email)")
    .eq("test_id", test.id)
    .order("started_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const shaped = (attempts ?? []).map((a: any) => ({
    attempt_id: a.id,
    student_id: a.student_id,
    student_name: a.users?.full_name || a.users?.email || "Unknown",
    student_email: a.users?.email ?? "",
    status: a.status,
    score: a.score,
    total_questions: a.total_questions,
    time_taken_seconds: a.time_taken_seconds,
    started_at: a.started_at,
    submitted_at: a.submitted_at,
  }));

  return NextResponse.json({ attempts: shaped });
}

// POST /api/aptitude/tests/[id]/attempts -> start a new attempt, or
// return the existing one if the student already has one.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const test = await loadTest(params.id);
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const classIds = await assignedClassIds(test.id);
  const memberships = await Promise.all(classIds.map((cid) => isClassMember(cid, user.id)));
  if (!memberships.some(Boolean)) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const supabase = supabaseAdmin();
  let { data: attempt } = await supabase
    .from("aptitude_test_attempts")
    .select("*")
    .eq("test_id", test.id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!attempt) {
    const { data: created, error } = await supabase
      .from("aptitude_test_attempts")
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
      score: attempt.score,
      total_questions: attempt.total_questions,
      started_at: attempt.started_at,
    },
    remaining_seconds: remainingSeconds(attempt.started_at, test.time_limit_minutes),
    test: {
      id: test.id,
      name: test.name,
      time_limit_minutes: test.time_limit_minutes,
    },
    questions,
  });
}
