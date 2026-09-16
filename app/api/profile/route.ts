import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// PATCH /api/profile { full_name } -> updates the signed-in user's own
// `users` row only. Email is intentionally not editable here (out of
// scope for this task); password changes go straight through Supabase
// Auth from the client, not through this route.
export async function PATCH(req: Request) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { full_name } = await req.json();
  if (!full_name?.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .update({ full_name: full_name.trim() })
    .eq("id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}
