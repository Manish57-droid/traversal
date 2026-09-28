import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { detectPlatform, guessTitleFromUrl, isValidUrl } from "@/lib/platform";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { QUESTION_SELECT, mapQuestion } from "@/lib/dsaQuestions";

// Platforms bucketed as: LeetCode / HackerRank / CodeChef individually
// (the three most-assigned judges), everything else (Codeforces,
// GeeksforGeeks, and the catch-all "other") folded into "others" — the
// enum only has 6 values total and three of them are already low-volume,
// so a 4th filter bucket reads cleaner than 6 near-empty individual ones.
const OTHERS_PLATFORMS = ["codeforces", "geeksforgeeks", "other"] as const;
const NAMED_PLATFORMS = ["leetcode", "hackerrank", "codechef"] as const;

async function replaceCompanies(questionId: string, companies: { company_id: string; frequency: number | null }[]) {
  const supabase = supabaseAdmin();
  const { error: deleteError } = await supabase.from("question_companies").delete().eq("question_id", questionId);
  if (deleteError) return deleteError.message;
  if (companies.length > 0) {
    const { error: insertError } = await supabase.from("question_companies").insert(
      companies.map((c) => ({ question_id: questionId, company_id: c.company_id, frequency: c.frequency ?? null }))
    );
    if (insertError) return insertError.message;
  }
  return null;
}

// GET /api/questions?platform=&difficulty=  -> list questions in the
//   bank, optionally filtered (both combine with AND). Any signed-in
//   role can read (e.g. to see what's assigned).
//   platform: "leetcode" | "hackerrank" | "codechef" | "others"
//   difficulty: "easy" | "medium" | "hard" (the enum's "medium" is
//     shown as "Intermediate" in the UI — the stored value never
//     changes, only the label)
// POST /api/questions  -> add a question to the shared bank. Teacher/admin
//                          only — students only ever see questions via
//                          assignments, they don't add their own.
export async function GET(req: Request) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const difficulty = searchParams.get("difficulty");

  const supabase = supabaseAdmin();

  try {
    const data = await fetchAllRows((from, to) => {
      let query = supabase.from("questions").select(QUESTION_SELECT).order("created_at", { ascending: false }).range(from, to);
      if (platform === "others") {
        query = query.in("platform", [...OTHERS_PLATFORMS]);
      } else if (platform && (NAMED_PLATFORMS as readonly string[]).includes(platform)) {
        query = query.eq("platform", platform);
      }
      if (difficulty === "easy" || difficulty === "medium" || difficulty === "hard") {
        query = query.eq("difficulty", difficulty);
      }
      return query;
    });
    return NextResponse.json({ questions: data.map(mapQuestion) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Resolves a topic_id into its current name (or null for "leave
// uncategorized"), so `topic` (the denormalized display text every
// other reader in the app relies on) never drifts from topic_id.
async function resolveTopicName(topicId: string | null): Promise<{ topic_id: string | null; topic: string | null } | { error: string }> {
  if (!topicId) return { topic_id: null, topic: null };
  const supabase = supabaseAdmin();
  const { data: topicRow } = await supabase.from("dsa_topics").select("name").eq("id", topicId).maybeSingle();
  if (!topicRow) return { error: "Topic not found." };
  return { topic_id: topicId, topic: topicRow.name };
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { url, title, topic_id, difficulty, companies } = body ?? {};

  if (!url || !isValidUrl(url)) {
    return NextResponse.json({ error: "A valid URL is required." }, { status: 400 });
  }

  const topicResult = await resolveTopicName(topic_id || null);
  if ("error" in topicResult) return NextResponse.json({ error: topicResult.error }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data: question, error } = await supabase
    .from("questions")
    .insert({
      url,
      title: title?.trim() || guessTitleFromUrl(url),
      platform: detectPlatform(url),
      ...topicResult,
      difficulty: difficulty || "unknown",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(companies) && companies.length > 0) {
    const companyError = await replaceCompanies(question.id, companies);
    if (companyError) return NextResponse.json({ error: companyError }, { status: 500 });
  }

  const { data: full, error: refetchError } = await supabase
    .from("questions")
    .select(QUESTION_SELECT)
    .eq("id", question.id)
    .single();
  if (refetchError) return NextResponse.json({ error: refetchError.message }, { status: 500 });

  return NextResponse.json({ question: mapQuestion(full) }, { status: 201 });
}

// PATCH /api/questions { id, url?, topic_id?, companies? } -> partial
// update. `url` fills in the real link for a bulk-seeded question
// flagged `needs_link_curation` (or fixes a wrong one on any question)
// and clears that flag. `topic_id` (a topic's id, or null) moves the
// question into a different folder — omit the key entirely to leave
// it untouched; pass it explicitly as null to uncategorize. `companies`
// (an array, possibly empty), when present, REPLACES the question's
// full company/frequency tagging.
export async function PATCH(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, url, companies } = body ?? {};
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const update: Record<string, unknown> = {};

  if (url !== undefined) {
    if (!url || !isValidUrl(url)) {
      return NextResponse.json({ error: "A valid url is required." }, { status: 400 });
    }
    update.url = url;
    update.platform = detectPlatform(url);
    update.needs_link_curation = false;
  }

  if ("topic_id" in body) {
    const topicResult = await resolveTopicName(body.topic_id || null);
    if ("error" in topicResult) return NextResponse.json({ error: topicResult.error }, { status: 400 });
    Object.assign(update, topicResult);
  }

  if (Object.keys(update).length === 0 && !Array.isArray(companies)) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  if (Array.isArray(companies)) {
    const companyError = await replaceCompanies(id, companies);
    if (companyError) return NextResponse.json({ error: companyError }, { status: 500 });
  }

  if (Object.keys(update).length === 0) {
    const { data: full, error: refetchError } = await supabase.from("questions").select(QUESTION_SELECT).eq("id", id).single();
    if (refetchError) return NextResponse.json({ error: refetchError.message }, { status: 500 });
    return NextResponse.json({ question: mapQuestion(full) });
  }

  const { data: question, error } = await supabase
    .from("questions")
    .update(update)
    .eq("id", id)
    .select(QUESTION_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question: mapQuestion(question) });
}
