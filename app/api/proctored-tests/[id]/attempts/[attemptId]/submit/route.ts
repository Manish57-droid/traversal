import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { finalizeAttempt } from "@/lib/proctoredScoring";

// POST /api/proctored-tests/[id]/attempts/[attemptId]/submit
// The only place an attempt's score is ever computed. Deliberately
// takes no body — whether this is a normal manual submit, a timeout,
// or a violation-triggered auto-submit is derived entirely from the
// attempt's own server-known state (violation_count vs the test's
// threshold, elapsed time vs its limit) inside finalizeAttempt, never
// from anything the client claims. Idempotent: calling this twice
// (e.g. a double-click, or the violations endpoint having already
// closed it out) just returns the existing result.
export async function POST(req: Request, { params }: { params: { id: string; attemptId: string } }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const result = await finalizeAttempt(attempt, test);
  return NextResponse.json(result);
}
