import { notFound } from "next/navigation";
import type { AptitudeCategory } from "@/types";
import { getAptitudeTheory } from "@/lib/aptitude-theory";
import AptitudeTopicPractice from "@/components/AptitudeTopicPractice";
import { APTITUDE_CATEGORY_LABELS } from "@/lib/aptitudeTopics";

// Theory is static (lib/aptitude-theory), so only this topic's body is
// sent to the client; questions are still fetched client-side.
export default function AptitudeTopicPage({ params }: { params: { category: string; topic: string } }) {
  if (!(params.category in APTITUDE_CATEGORY_LABELS)) notFound();
  const category = params.category as AptitudeCategory;
  const topic = decodeURIComponent(params.topic);
  const theory = getAptitudeTheory(category, topic);

  return (
    <AptitudeTopicPractice
      category={category}
      topic={topic}
      theory={theory && { body: theory.body, readMinutes: theory.readMinutes }}
    />
  );
}
