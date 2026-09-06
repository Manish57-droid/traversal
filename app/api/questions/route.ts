import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { detectPlatform, guessTitleFromUrl, isValidUrl } from "@/lib/platform";

// GET  /api/questions  -> list every question in the bank (any signed-in
//                          role can read it, e.g. to see what's assigned)
// POST /api/questions  -> add a question to the shared bank. Teacher/admin
//                          only — students only ever see questions via
//                          assignments, they don't add their own.
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .order("created_at", { ascending: false });

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
