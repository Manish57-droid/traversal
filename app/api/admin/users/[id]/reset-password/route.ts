import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { passwordStrengthError } from "@/lib/passwordStrength";

// POST /api/admin/users/[id]/reset-password { password } -> admin sets
// a new password directly (Supabase Auth admin API — no email/OTP
// round trip) and flags the account force_password_change, so the
// user is required to replace it with their own on next sign-in (see
// middleware.ts and /change-password).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireRole(["admin"]).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { password } = await req.json();
  if (!password) return NextResponse.json({ error: "password is required." }, { status: 400 });
  const strengthError = passwordStrengthError(password);
  if (strengthError) return NextResponse.json({ error: strengthError }, { status: 400 });

  const supabase = supabaseAdmin();

  const { error: authError } = await supabase.auth.admin.updateUserById(params.id, { password });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const { error } = await supabase.from("users").update({ force_password_change: true }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ reset: true });
}
