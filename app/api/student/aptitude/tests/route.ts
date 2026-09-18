import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET /api/student/aptitude/tests -> every Aptitude Test Mode test
// assigned to a class the signed-in student belongs to, with their own
// attempt status — powers the "Tests" section on the student Aptitude
// index page.
export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = supabaseAdmin();

  const { data: memberships } = await supabase.from("class_members").select("class_id").eq("student_id", user.id);
  const classIds = (memberships ?? []).map((m) => m.class_id);
  if (classIds.length === 0) return NextResponse.json({ tests: [] });

  const { data: assignments, error } = await supabase
    .from("aptitude_assignments")
    .select("due_date, classes(name), aptitude_tests(*)")
    .in("class_id", classIds)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const testIds = (assignments ?? []).map((a: any) => a.aptitude_tests?.id).filter(Boolean);
  const { data: attempts } = testIds.length
    ? await supabase
        .from("aptitude_test_attempts")
        .select("test_id, status, score, total_questions")
        .eq("student_id", user.id)
        .in("test_id", testIds)
    : { data: [] };

  const attemptByTest = new Map((attempts ?? []).map((a) => [a.test_id, a]));

  const shaped = (assignments ?? [])
    .filter((a: any) => a.aptitude_tests)
    .map((a: any) => {
      const t = a.aptitude_tests;
      const attempt = attemptByTest.get(t.id);
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        class_name: a.classes?.name ?? "",
        time_limit_minutes: t.time_limit_minutes,
        due_date: a.due_date,
        results_released: t.results_released,
        attempt_status: attempt?.status ?? "not_started",
        score: attempt?.score ?? null,
        total_questions: attempt?.total_questions ?? null,
      };
    });

  return NextResponse.json({ tests: shaped });
}
