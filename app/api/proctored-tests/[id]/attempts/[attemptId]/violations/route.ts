import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { remainingSeconds, finalizeAttempt } from "@/lib/proctoredScoring";
import type { ProctoredViolationType } from "@/types";

const VALID_TYPES: ProctoredViolationType[] = ["tab_switch", "fullscreen_exit", "copy_attempt", "camera_off"];

// POST /api/proctored-tests/[id]/attempts/[attemptId]/violations { violation_type }
// Logs one violation row and increments violation_count server-side
// — the client only ever reports *that* something happened, never how
// many violations exist in total; that count lives in the DB. If this
// push crosses the test's max_violations_before_autosubmit, the
// attempt is force-submitted in the same request and the response
// tells the client to redirect to the result screen.
export async function POST(req: Request, { params }: { params: { id: string; attemptId: string } }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { violation_type } = await req.json();
  if (!VALID_TYPES.includes(violation_type)) {
    return NextResponse.json({ error: "Invalid violation_type." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: attempt } = await supabase
    .from("proctored_test_attempts")
    .select("*")
    .eq("id", params.attemptId)
    .eq("test_id", params.id)
    .maybeSingle();

  if (!attempt || attempt.student_id !== user.id) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  const { data: test } = await supabase.from("proctored_tests").select("*").eq("id", params.id).single();

  if (attempt.status !== "in_progress") {
    return NextResponse.json({ violation_count: attempt.violation_count, autoSubmitted: true, alreadyFinished: true });
  }

  const remaining = remainingSeconds(attempt.started_at, test.time_limit_minutes);
  if (remaining <= 0) {
    const result = await finalizeAttempt(attempt, test);
    return NextResponse.json({ violation_count: attempt.violation_count, autoSubmitted: true, result });
  }

  const { error: insertError } = await supabase
    .from("proctored_violations")
    .insert({ attempt_id: attempt.id, violation_type });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // A single atomic UPDATE inside Postgres (see 0009_proctored_violation_increment.sql)
  // — two violations arriving within the same request-response window
  // (e.g. a fullscreen exit immediately followed by a tab switch) must
  // never race on a read-then-write increment done in JS, or the count
  // under-reports and the auto-submit threshold below can be missed.
  const { data: newCount, error: incrementError } = await supabase.rpc("increment_proctored_violation_count", {
    p_attempt_id: attempt.id,
  });
  if (incrementError) return NextResponse.json({ error: incrementError.message }, { status: 500 });

  if (newCount >= test.max_violations_before_autosubmit) {
    const result = await finalizeAttempt({ ...attempt, violation_count: newCount }, test);
    return NextResponse.json({ violation_count: newCount, autoSubmitted: true, result });
  }

  return NextResponse.json({ violation_count: newCount, autoSubmitted: false });
}
