import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization, isAuthorized } from "@/lib/classAccess";
import { getSectionsWithQuestions } from "@/lib/proctoredSections";
import { notifyClassMembers } from "@/lib/notifications";

// GET  /api/proctored-tests?classId=xxx -> list proctored tests for a
//       class, with a question_count summed across every section.
//       Teacher/admin only, and only if authorized on that specific
//       class (owner/collaborator/admin).
// POST /api/proctored-tests { class_id, name, description?, time_limit_minutes,
//       negative_marking_fraction?, max_violations_before_autosubmit?,
//       require_camera?, require_mic?, timer_mode?, allow_free_section_navigation?,
//       sections: [{ name, set_ids, time_limit_minutes?, negative_marking_fraction?, calculator_enabled? }] }
//       -> creates the test plus its sections and each section's
//       enabled-Set rows. At least one section, each with at least one
//       enabled Set, is required — a test with zero sections/questions
//       can't be created (same spirit as the old "at least one
//       question" requirement, just moved up a level). A Set's
//       questions can span any Subjects — Sections no longer gate on
//       Subject at all. Same class-scoped authorization check as
//       POST /api/assign.
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
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tests = await Promise.all(
    (data ?? []).map(async (t: any) => {
      const sections = await getSectionsWithQuestions(t.id);
      return {
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
        timer_mode: t.timer_mode,
        allow_free_section_navigation: t.allow_free_section_navigation,
        question_count: sections.reduce((sum, s) => sum + s.questions.length, 0),
      };
    })
  );

  return NextResponse.json({ tests, authorization: classAuth });
}

interface SectionInput {
  name?: string;
  set_ids?: string[];
  time_limit_minutes?: number | null;
  negative_marking_fraction?: number | null;
  calculator_enabled?: boolean;
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
    timer_mode,
    allow_free_section_navigation,
    sections,
  } = body ?? {};

  if (!class_id) return NextResponse.json({ error: "class_id is required." }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const timeLimit = Number(time_limit_minutes);
  if (!Number.isInteger(timeLimit) || timeLimit <= 0) {
    return NextResponse.json({ error: "time_limit_minutes must be a positive integer." }, { status: 400 });
  }
  if (timer_mode !== undefined && timer_mode !== "combined" && timer_mode !== "per_section") {
    return NextResponse.json({ error: "timer_mode must be 'combined' or 'per_section'." }, { status: 400 });
  }
  if (!Array.isArray(sections) || sections.length === 0) {
    return NextResponse.json({ error: "At least one section is required." }, { status: 400 });
  }

  const sectionInputs = sections as SectionInput[];
  for (let i = 0; i < sectionInputs.length; i++) {
    const s = sectionInputs[i];
    if (!s.name?.trim()) return NextResponse.json({ error: `Section ${i + 1}: name is required.` }, { status: 400 });
    if (!Array.isArray(s.set_ids) || s.set_ids.length === 0) {
      return NextResponse.json({ error: `Section ${i + 1}: at least one Set is required.` }, { status: 400 });
    }
  }

  const classAuth = await getClassAuthorization(class_id, user.id, user.role);
  if (!isAuthorized(classAuth)) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }

  const supabase = supabaseAdmin();

  // Sanity check: every enabled Set must actually contain at least one
  // question, or a section would silently be empty — this is exactly
  // the "live question count per section" the creation UI shows, just
  // re-verified server-side rather than trusted from the client.
  const allSetIds = Array.from(new Set(sectionInputs.flatMap((s) => s.set_ids as string[])));
  const { data: setCounts, error: setCountError } = await supabase
    .from("proctored_question_sets")
    .select("set_id")
    .in("set_id", allSetIds);
  if (setCountError) return NextResponse.json({ error: setCountError.message }, { status: 500 });
  const nonEmptySetIds = new Set((setCounts ?? []).map((r: any) => r.set_id));
  for (let i = 0; i < sectionInputs.length; i++) {
    const hasQuestions = (sectionInputs[i].set_ids as string[]).some((id) => nonEmptySetIds.has(id));
    if (!hasQuestions) {
      return NextResponse.json({ error: `Section ${i + 1} ("${sectionInputs[i].name}") has no questions in any enabled Set.` }, { status: 400 });
    }
  }

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
      timer_mode: timer_mode || "combined",
      allow_free_section_navigation: allow_free_section_navigation === undefined ? true : !!allow_free_section_navigation,
      created_by: user.id,
    })
    .select()
    .single();

  if (testError) return NextResponse.json({ error: testError.message }, { status: 500 });

  const sectionRows = sectionInputs.map((s, i) => ({
    test_id: test.id,
    name: s.name!.trim(),
    position: i,
    time_limit_minutes: s.time_limit_minutes ?? null,
    negative_marking_fraction: s.negative_marking_fraction ?? null,
    calculator_enabled: !!s.calculator_enabled,
  }));

  const { data: insertedSections, error: sectionError } = await supabase
    .from("proctored_test_sections")
    .insert(sectionRows)
    .select();

  if (sectionError) {
    await supabase.from("proctored_tests").delete().eq("id", test.id);
    return NextResponse.json({ error: sectionError.message }, { status: 500 });
  }

  const sectionSetRows = (insertedSections ?? []).flatMap((section: any, i: number) =>
    (sectionInputs[i].set_ids as string[]).map((set_id) => ({ section_id: section.id, set_id }))
  );

  const { error: setLinkError } = await supabase.from("proctored_test_section_sets").insert(sectionSetRows);
  if (setLinkError) {
    await supabase.from("proctored_tests").delete().eq("id", test.id);
    return NextResponse.json({ error: setLinkError.message }, { status: 500 });
  }

  // Best-effort — a notification failing shouldn't fail test creation
  // that already succeeded.
  await notifyClassMembers(class_id, {
    type: "proctored_test",
    title: `New test: ${test.name}`,
    href: `/student/proctored-tests/${test.id}/start`,
  }).catch(() => {});

  return NextResponse.json({ test }, { status: 201 });
}
