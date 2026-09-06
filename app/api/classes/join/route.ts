import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// POST /api/classes/join { join_code } -> a student joins a teacher's class
export async function POST(req: Request) {
  const user = await getCurrentAppUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { join_code } = await req.json();
  if (!join_code?.trim()) {
    return NextResponse.json({ error: "Join code is required." }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: cls, error: findError } = await supabase
    .from("classes")
    .select("id")
    .eq("join_code", join_code.trim().toLowerCase())
    .single();

  if (findError || !cls) {
    return NextResponse.json({ error: "No class found with that code." }, { status: 404 });
  }

  const { error } = await supabase
    .from("class_members")
    .insert({ class_id: cls.id, student_id: user.id });

  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ joined: true, class_id: cls.id });
}
