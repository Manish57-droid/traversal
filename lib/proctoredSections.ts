import { supabaseAdmin } from "@/lib/supabase/server";
import type { QuestionDifficulty } from "@/types";

// The one place a test's sections and their questions get resolved —
// shared by attempt-start, scoring (lib/proctoredScoring.ts), and the
// review screen, so none of them need to know whether a given section
// is "legacy" (its questions live directly in proctored_test_questions,
// wrapped there by migration 0013) or "new" (its questions are
// resolved dynamically from whichever Sets are enabled for it via
// proctored_test_section_sets — always current, never snapshotted).

export interface ResolvedSection {
  id: string;
  test_id: string;
  name: string;
  subject_id: string | null;
  position: number;
  time_limit_minutes: number | null;
  negative_marking_fraction: number | null;
  calculator_enabled: boolean;
}

export interface ResolvedQuestion {
  id: string;
  section_id: string;
  prompt: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
  difficulty: QuestionDifficulty;
  image_url: string | null;
}

export interface SectionWithQuestions extends ResolvedSection {
  questions: ResolvedQuestion[];
}

export async function getSectionsForTest(testId: string): Promise<ResolvedSection[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("proctored_test_sections")
    .select("*")
    .eq("test_id", testId)
    .order("position", { ascending: true });
  return (data ?? []) as ResolvedSection[];
}

const QUESTION_FIELDS = "id, prompt, options, correct_option, explanation, difficulty, image_url";

/** Every section of a test, each carrying its fully-resolved (full,
 * not sanitized) question list in a stable order. Legacy sections
 * (no section_sets rows) pull from proctored_test_questions by
 * position; sections with enabled Sets pull every question whose
 * set_id matches one of them, ordered by creation time. */
export async function getSectionsWithQuestions(testId: string): Promise<SectionWithQuestions[]> {
  const supabase = supabaseAdmin();
  const sections = await getSectionsForTest(testId);
  if (sections.length === 0) return [];

  const sectionIds = sections.map((s) => s.id);

  const [{ data: legacyRows }, { data: sectionSets }] = await Promise.all([
    supabase
      .from("proctored_test_questions")
      .select(`section_id, position, proctored_questions(${QUESTION_FIELDS})`)
      .in("section_id", sectionIds)
      .order("position", { ascending: true }),
    supabase.from("proctored_test_section_sets").select("section_id, set_id").in("section_id", sectionIds),
  ]);

  const setIdsBySection = new Map<string, string[]>();
  for (const row of sectionSets ?? []) {
    const list = setIdsBySection.get(row.section_id) ?? [];
    list.push(row.set_id);
    setIdsBySection.set(row.section_id, list);
  }

  const legacyBySection = new Map<string, ResolvedQuestion[]>();
  for (const row of (legacyRows ?? []) as any[]) {
    if (!row.proctored_questions) continue;
    const list = legacyBySection.get(row.section_id) ?? [];
    list.push({ ...row.proctored_questions, section_id: row.section_id });
    legacyBySection.set(row.section_id, list);
  }

  const allSetIds = Array.from(new Set(Array.from(setIdsBySection.values()).flat()));
  const questionsBySet = new Map<string, ResolvedQuestion[]>();
  if (allSetIds.length > 0) {
    const { data: dynQuestions } = await supabase
      .from("proctored_questions")
      .select(`${QUESTION_FIELDS}, set_id`)
      .in("set_id", allSetIds)
      .order("created_at", { ascending: true });
    for (const q of (dynQuestions ?? []) as any[]) {
      const list = questionsBySet.get(q.set_id) ?? [];
      list.push({
        id: q.id,
        prompt: q.prompt,
        options: q.options,
        correct_option: q.correct_option,
        explanation: q.explanation,
        difficulty: q.difficulty,
        image_url: q.image_url,
        section_id: "", // filled in per-section below
      });
      questionsBySet.set(q.set_id, list);
    }
  }

  return sections.map((section) => {
    const enabledSetIds = setIdsBySection.get(section.id) ?? [];
    const questions =
      enabledSetIds.length > 0
        ? enabledSetIds.flatMap((setId) => (questionsBySet.get(setId) ?? []).map((q) => ({ ...q, section_id: section.id })))
        : legacyBySection.get(section.id) ?? [];
    return { ...section, questions };
  });
}

/** Flat, ordered (section position, then within-section order) list
 * across every section — used wherever the current single-list take
 * screen / review screen still expects one array (each entry tags its
 * own section_id/section_name so a future section-aware UI can group
 * them without another round trip). */
export async function getFlatQuestionsForTest(
  testId: string
): Promise<(ResolvedQuestion & { section_name: string })[]> {
  const sections = await getSectionsWithQuestions(testId);
  return sections.flatMap((s) => s.questions.map((q) => ({ ...q, section_name: s.name })));
}

/** Makes sure every section of a test has a proctored_section_attempts
 * row for this attempt (status 'not_started' by default) — called when
 * an attempt starts, so section-locking/per-section timers always have
 * something to read regardless of navigation mode, rather than lazily
 * creating rows as a student happens to open each section. */
export async function ensureSectionAttempts(attemptId: string, testId: string) {
  const supabase = supabaseAdmin();
  const sections = await getSectionsForTest(testId);
  if (sections.length === 0) return;
  const rows = sections.map((s) => ({ attempt_id: attemptId, section_id: s.id }));
  await supabase.from("proctored_section_attempts").upsert(rows, { onConflict: "attempt_id,section_id", ignoreDuplicates: true });
}

export function sanitizeQuestion(q: ResolvedQuestion & { section_name?: string }) {
  return {
    id: q.id,
    prompt: q.prompt,
    options: q.options,
    difficulty: q.difficulty,
    image_url: q.image_url,
    section_id: q.section_id,
    section_name: q.section_name,
  };
}
