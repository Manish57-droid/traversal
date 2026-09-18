import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { finalizeAptitudeAttempt } from "@/lib/aptitudeScoring";

// POST /api/aptitude/tests/[id]/attempts/[attemptId]/submit
// The only place an attempt's score is ever computed. Takes no body —
// whether this is a manual submit or a timeout is derived entirely
// from elapsed time vs. the test's limit inside finalizeAptitudeAttempt,
// never from anything the client claims. Idempotent.
export async function POST(req: Request, { params }: { params: { id: string; attemptId: string } }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const { data: attempt } = await supabase
    .from("aptitude_test_attempts")
    .select("*")
    .eq("id", params.attemptId)
    .eq("test_id", params.id)
    .maybeSingle();

  if (!attempt || attempt.student_id !== user.id) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  const { data: test } = await supabase.from("aptitude_tests").select("*").eq("id", params.id).single();

  const result = await finalizeAptitudeAttempt(attempt, test);
  return NextResponse.json(result);
}
