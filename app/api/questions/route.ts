import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { detectPlatform, guessTitleFromUrl, isValidUrl } from "@/lib/platform";

// Platforms bucketed as: LeetCode / HackerRank / CodeChef individually
// (the three most-assigned judges), everything else (Codeforces,
// GeeksforGeeks, and the catch-all "other") folded into "others" — the
// enum only has 6 values total and three of them are already low-volume,
// so a 4th filter bucket reads cleaner than 6 near-empty individual ones.
const OTHERS_PLATFORMS = ["codeforces", "geeksforgeeks", "other"] as const;
const NAMED_PLATFORMS = ["leetcode", "hackerrank", "codechef"] as const;

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
  let query = supabase.from("questions").select("*").order("created_at", { ascending: false });

  if (platform === "others") {
    query = query.in("platform", [...OTHERS_PLATFORMS]);
  } else if (platform && (NAMED_PLATFORMS as readonly string[]).includes(platform)) {
    query = query.eq("platform", platform);
  }

  if (difficulty === "easy" || difficulty === "medium" || difficulty === "hard") {
    query = query.eq("difficulty", difficulty);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ questions: data });
}

export async function POST(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { url, title, topic, difficulty } = body ?? {};

  if (!url || !isValidUrl(url)) {
    return NextResponse.json({ error: "A valid URL is required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: question, error } = await supabase
    .from("questions")
    .insert({
      url,
      title: title?.trim() || guessTitleFromUrl(url),
      platform: detectPlatform(url),
      topic: topic || null,
      difficulty: difficulty || "unknown",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question }, { status: 201 });
}

// PATCH /api/questions { id, url } -> fill in the real link for a
// bulk-seeded question that was flagged `needs_link_curation` (or fix
// a wrong one on any question). Clears the flag once a valid url is set.
export async function PATCH(req: Request) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, url } = await req.json();
  if (!id || !url || !isValidUrl(url)) {
    return NextResponse.json({ error: "id and a valid url are required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: question, error } = await supabase
    .from("questions")
    .update({ url, platform: detectPlatform(url), needs_link_curation: false })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question });
}
