import { notFound } from "next/navigation";
import { getGuide } from "@/lib/interview-guides";
import GuideReader from "@/components/interview-prep/GuideReader";

// One guide topic per page. Content is static (lib/interview-guides),
// so only the current topic's body is sent to the client, plus the
// titles needed for the topic list and paging.
export default function GuideTopicPage({ params }: { params: { guide: string; topic: string } }) {
  const guide = getGuide(params.guide);
  if (!guide) notFound();

  const currentIndex = guide.topics.findIndex((t) => t.slug === params.topic);
  if (currentIndex === -1) notFound();
  const topic = guide.topics[currentIndex];

  return (
    <GuideReader
      guide={{ slug: guide.slug, name: guide.name, icon: guide.icon }}
      topics={guide.topics.map(({ slug, title, difficulty }) => ({ slug, title, difficulty }))}
      currentIndex={currentIndex}
      body={topic.body}
      readMinutes={topic.readMinutes}
    />
  );
}
