import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { StudentAnalyticsDetail, StudentAptitudeDetailRow, StudentDsaDetailRow } from "@/types";

// GET /api/teacher/analytics/student/:studentId?classId=...
// Full DSA + Aptitude breakdown for one student. `classId` is required
// and used only to verify the requesting teacher actually has this
// student in one of their own classes — same ownership check as the
// class-level route, just keyed off membership instead of class_id.
export async function GET(req: Request, { params }: { params: { studentId: string } }) {
  const user = await requireRole(["teacher", "admin"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  if (!classId) return NextResponse.json({ error: "classId is required." }, { status: 400 });

  const supabase = supabaseAdmin();

  let classQuery = supabase.from("classes").select("id").eq("id", classId);
  if (user.role !== "admin") classQuery = classQuery.eq("teacher_id", user.id);
  const { data: klass, error: classError } = await classQuery.maybeSingle();
  if (classError) return NextResponse.json({ error: classError.message }, { status: 500 });
  if (!klass) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  const { data: membership, error: memberError } = await supabase
    .from("class_members")
    .select("student_id, users(id, full_name, email)")
    .eq("class_id", classId)
    .eq("student_id", params.studentId)
    .maybeSingle();

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });
  if (!membership) return NextResponse.json({ error: "That student isn't in this class." }, { status: 404 });

  const { data: dsaRows, error: dsaError } = await supabase
    .from("progress")
    .select("question_id, status, updated_at, completed_at, questions(title, platform)")
    .eq("student_id", params.studentId)
    .order("updated_at", { ascending: false });

  if (dsaError) return NextResponse.json({ error: dsaError.message }, { status: 500 });

  const { data: aptRows, error: aptError } = await supabase
    .from("aptitude_practice_history")
    .select("question_id, last_correct, attempts_count, first_correct_at, aptitude_questions(topic, category)")
    .eq("student_id", params.studentId)
    .order("last_attempted_at", { ascending: false });

  if (aptError) return NextResponse.json({ error: aptError.message }, { status: 500 });

  const dsa: StudentDsaDetailRow[] = (dsaRows ?? []).map((r: any) => ({
    question_id: r.question_id,
    title: r.questions?.title ?? "Untitled question",
    platform: r.questions?.platform ?? "other",
    status: r.status,
    updated_at: r.updated_at,
    completed_at: r.completed_at,
  }));

  const aptitude: StudentAptitudeDetailRow[] = (aptRows ?? []).map((r: any) => ({
    question_id: r.question_id,
    topic: r.aptitude_questions?.topic ?? "Unknown topic",
    category: r.aptitude_questions?.category ?? "quant",
    last_correct: r.last_correct,
    attempts_count: r.attempts_count,
    first_correct_at: r.first_correct_at,
  }));

  const detail: StudentAnalyticsDetail = {
    student_id: params.studentId,
    full_name: (membership as any).users?.full_name ?? null,
    email: (membership as any).users?.email ?? "",
    dsa,
    aptitude,
  };

  return NextResponse.json({ detail });
}
