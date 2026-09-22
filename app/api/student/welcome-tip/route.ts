import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET   /api/student/welcome-tip -> whether the signed-in student
//        still needs to see the one-time "try Interview Prep" nudge.
// PATCH /api/student/welcome-tip -> marks it seen (dismissed or
//        clicked through) so it never shows again for this account.
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ seen: user.interview_prep_tip_seen });
}

export async function PATCH() {
  const user = await getCurrentAppUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("users")
    .update({ interview_prep_tip_seen: true })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ seen: true });
}
