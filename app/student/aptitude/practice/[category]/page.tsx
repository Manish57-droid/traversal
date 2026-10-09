import { notFound } from "next/navigation";
import type { AptitudeCategory } from "@/types";
import { theoryTopicKeys } from "@/lib/aptitude-theory";
import AptitudeTopicPicker from "@/components/AptitudeTopicPicker";
import { APTITUDE_CATEGORY_LABELS } from "@/lib/aptitudeTopics";

export default function AptitudeTopicPickerPage({ params }: { params: { category: string } }) {
  if (!(params.category in APTITUDE_CATEGORY_LABELS)) notFound();
  const category = params.category as AptitudeCategory;
  return <AptitudeTopicPicker category={category} theoryKeys={theoryTopicKeys(category)} />;
}
