import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization } from "@/lib/classAccess";

// GET  /api/classes/:id/access-requests -> pending requests for this
//        class. Owner or admin only — NOT a collaborator; deciding who
//        else gets access stays with the owner (and admin as backstop).
// POST /api/classes/:id/access-requests -> the signed-in teacher
//        requests access to this class. Blocked if they already have
//        access, or already have a pending request for it.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const auth = await getClassAuthorization(params.id, user.id, user.role);
  if (auth !== "owner" && auth !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("class_access_requests")
    // class_access_requests has two FKs to users (requesting_teacher_id,
    // resolved_by) — PostgREST needs the explicit constraint name or
    // this embed is ambiguous.
    .select("id, requesting_teacher_id, requested_at, users!class_access_requests_requesting_teacher_id_fkey(full_name, email)")
    .eq("class_id", params.id)
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const requests = (data ?? []).map((r: any) => ({
    id: r.id,
    requesting_teacher_id: r.requesting_teacher_id,
    requested_at: r.requested_at,
    full_name: r.users?.full_name ?? null,
    email: r.users?.email ?? "",
  }));

  return NextResponse.json({ requests });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["teacher"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const auth = await getClassAuthorization(params.id, user.id, user.role);
  if (auth !== "none") {
    return NextResponse.json({ error: "You already have access to this class." }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: klass } = await supabase.from("classes").select("id").eq("id", params.id).maybeSingle();
  if (!klass) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  const { data: existing } = await supabase
    .from("class_access_requests")
    .select("id")
    .eq("class_id", params.id)
    .eq("requesting_teacher_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You already have a pending request for this class." }, { status: 400 });
  }

  const { data: request, error } = await supabase
    .from("class_access_requests")
    .insert({ class_id: params.id, requesting_teacher_id: user.id })
    .select()
    .single();

  // The DB's partial unique index is the real guard against a race
  // between the check above and this insert — surface it the same way
  // as the pre-check if it fires.
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("uniq_pending_class_access_request")) {
      return NextResponse.json({ error: "You already have a pending request for this class." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ request }, { status: 201 });
}
