import type { SupabaseClient } from "@supabase/supabase-js";
import type { Question } from "@/types";

// Both companies and topics are many-to-many on a question (a question
// can be asked by several companies, and belong to several topics) —
// question_topics mirrors question_companies' junction-table shape,
// just without a payload column.
export const QUESTION_SELECT =
  "*, question_companies(frequency, companies(id, name)), question_topics(dsa_topics(id, name))";

export function mapQuestion(q: any): Question {
  return {
    ...q,
    companies: (q.question_companies ?? [])
      .filter((row: any) => row.companies)
      .map((row: any) => ({ id: row.companies.id, name: row.companies.name, frequency: row.frequency })),
    topics: (q.question_topics ?? [])
      .filter((row: any) => row.dsa_topics)
      .map((row: any) => ({ id: row.dsa_topics.id, name: row.dsa_topics.name })),
  };
}

// Questions filed in a teacher_only folder (e.g. "LeetCode Premium")
// never reach students. Returns a PostgREST `or` filter to apply to a
// questions query, or null when no such folder exists. topic_id null
// (uncategorized) must stay visible, so a bare `not.in` isn't enough —
// SQL's NOT IN drops NULLs.
export async function studentVisibleFilter(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.from("dsa_topics").select("id").eq("teacher_only", true);
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((t) => t.id);
  return ids.length ? `topic_id.is.null,topic_id.not.in.(${ids.join(",")})` : null;
}
