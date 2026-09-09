import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization } from "@/lib/classAccess";

// POST /api/classes/:id/access-requests/:requestId/approve
// Owner or admin only. Grants the requester equal (collaborator)
// rights on the class and marks the request resolved.
export async function POST(req: Request, { params }: { params: { id: string; requestId: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const auth = await getClassAuthorization(params.id, user.id, user.role);
  if (auth !== "owner" && auth !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = supabaseAdmin();

  const { data: request, error: fetchError } = await supabase
    .from("class_access_requests")
    .select("id, class_id, requesting_teacher_id, status")
    .eq("id", params.requestId)
    .eq("class_id", params.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (request.status !== "pending") {
    return NextResponse.json({ error: "This request has already been resolved." }, { status: 400 });
  }

  const { error: collabError } = await supabase
    .from("class_collaborators")
    .upsert(
      { class_id: params.id, teacher_id: request.requesting_teacher_id, added_via: "request_approval" },
      { onConflict: "class_id,teacher_id", ignoreDuplicates: true }
    );
  if (collabError) return NextResponse.json({ error: collabError.message }, { status: 500 });

  const { data: updated, error: updateError } = await supabase
    .from("class_access_requests")
    .update({ status: "approved", resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq("id", params.requestId)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ request: updated });
}
