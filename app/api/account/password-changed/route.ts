import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// POST /api/account/password-changed -> clears the signed-in user's
// own force_password_change flag. Called by /change-password right
// after supabase.auth.updateUser({password}) succeeds — that call
// changes the password itself; this just lets middleware stop
// redirecting them here on every request.
export async function POST() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("users").update({ force_password_change: false }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: true });
}
