import { NextResponse } from "next/server";
import { getCurrentAppUser, requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClassAuthorization, isAuthorized, isClassMember } from "@/lib/classAccess";
import { notifyClassMembers } from "@/lib/notifications";
import type { ClassMaterial } from "@/types";

const BUCKET = "class-materials";
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

async function ensureBucket() {
  const supabase = supabaseAdmin();
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  // Race-safe: if another request created it between the check above
  // and here, createBucket errors "already exists" — safe to ignore.
  await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ALLOWED_TYPES,
  });
}

// GET  /api/classes/[id]/materials -> every document uploaded to this
//      class, newest first. Any signed-in role can read as long as
//      they're actually connected to the class: a teacher/admin via
//      getClassAuthorization (owner/collaborator/admin), a student via
//      class_members (isClassMember) — this is the one place both
//      sides of a class read the same list.
// POST /api/classes/[id]/materials (multipart/form-data: file, title?)
//      -> teacher/admin only, and only with class authorization.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed =
    user.role === "student"
      ? await isClassMember(params.id, user.id)
      : isAuthorized(await getClassAuthorization(params.id, user.id, user.role));

  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("class_materials")
    .select("*, users(full_name, email)")
    .eq("class_id", params.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const materials: ClassMaterial[] = (data ?? []).map((m: any) => ({
    id: m.id,
    class_id: m.class_id,
    title: m.title,
    file_url: m.file_url,
    file_name: m.file_name,
    file_type: m.file_type,
    file_size: m.file_size,
    uploaded_by: m.uploaded_by,
    uploaded_by_name: m.users?.full_name || m.users?.email || undefined,
    created_at: m.created_at,
  }));

  return NextResponse.json({ materials });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const classAuth = await getClassAuthorization(params.id, user.id, user.role);
  if (!isAuthorized(classAuth)) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const title = formData.get("title");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF or Word documents (.pdf, .doc, .docx) are allowed." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be 20MB or smaller." }, { status: 400 });
  }

  await ensureBucket();

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `${params.id}/${crypto.randomUUID()}.${ext}`;

  const supabase = supabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: material, error } = await supabase
    .from("class_materials")
    .insert({
      class_id: params.id,
      title: typeof title === "string" && title.trim() ? title.trim() : file.name,
      file_path: path,
      file_url: publicUrlData.publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    // Don't leave an orphaned object in storage if the DB insert failed.
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort — a notification failing shouldn't fail the upload
  // that already succeeded.
  await notifyClassMembers(params.id, {
    type: "class_material",
    title: `New material: ${material.title}`,
    href: "/student/study-material",
  }).catch(() => {});

  return NextResponse.json({ material }, { status: 201 });
}
