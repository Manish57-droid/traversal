import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSectionsForTest } from "@/lib/proctoredSections";

// PATCH /api/proctored-tests/[id]/attempts/[attemptId]/sections/[sectionId] { action: "enter" | "submit" }
// The data-model/API half of section-locking and per-section timers —
// the actual take-screen UI that calls this (palette, timer display,
// lock enforcement in the UI itself) is a separate follow-up task.
// "enter": sets started_at (first time only) and status='in_progress'.
//   Under locked navigation (allow_free_section_navigation = false),
//   a section can only be entered once every earlier-position section
//   is already 'completed' — enforced here, not just in a future UI,
//   since a locked section must actually be unreachable via a direct
//   API call too.
// "submit": sets submitted_at and status='completed'. Idempotent — if
//   the section is already completed, its state is returned unchanged.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; attemptId: string; sectionId: string } }
) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await req.json();
  if (action !== "enter" && action !== "submit") {
    return NextResponse.json({ error: "action must be 'enter' or 'submit'." }, { status: 400 });
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
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "This attempt is already finished.", status: attempt.status }, { status: 409 });
  }

  const { data: test } = await supabase.from("proctored_tests").select("*").eq("id", params.id).single();

  const sections = await getSectionsForTest(params.id);
  const section = sections.find((s) => s.id === params.sectionId);
  if (!section) return NextResponse.json({ error: "Section not found." }, { status: 404 });

  const { data: sectionAttempts } = await supabase
    .from("proctored_section_attempts")
    .select("*")
    .eq("attempt_id", attempt.id);

  const byId = new Map((sectionAttempts ?? []).map((sa: any) => [sa.section_id, sa]));
  const current = byId.get(section.id);
  if (!current) return NextResponse.json({ error: "Section attempt not initialized." }, { status: 500 });

  if (action === "enter") {
    if (current.status === "completed") {
      return NextResponse.json({ error: "This section has already been submitted." }, { status: 409 });
    }
    if (!test.allow_free_section_navigation) {
      const earlierSections = sections.filter((s) => s.position < section.position);
      const allEarlierDone = earlierSections.every((s) => byId.get(s.id)?.status === "completed");
      if (!allEarlierDone) {
        return NextResponse.json({ error: "Complete the earlier sections first." }, { status: 403 });
      }
    }

    const { data: updated, error } = await supabase
      .from("proctored_section_attempts")
      .update({ status: "in_progress", started_at: current.started_at ?? new Date().toISOString() })
      .eq("id", current.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ section_attempt: updated });
  }

  // action === "submit"
  if (current.status === "completed") {
    return NextResponse.json({ section_attempt: current });
  }
  const { data: updated, error } = await supabase
    .from("proctored_section_attempts")
    .update({ status: "completed", submitted_at: new Date().toISOString(), started_at: current.started_at ?? new Date().toISOString() })
    .eq("id", current.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ section_attempt: updated });
}
