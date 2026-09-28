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
