"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import ConceptPlayer from "@/components/concept/ConceptPlayer";
import TheoryPanel from "@/components/concept/TheoryPanel";
import TopicQuiz from "@/components/concept/TopicQuiz";
import ArrayScene from "@/components/concept/ArrayScene";
import StackScene from "@/components/concept/StackScene";
import LinkedListScene from "@/components/concept/LinkedListScene";
import TreeScene from "@/components/concept/TreeScene";
import { CONCEPT_TOPICS } from "@/lib/concepts/data";

export default function TopicPage({ params }: { params: { slug: string } }) {
  const topic = CONCEPT_TOPICS.find((t) => t.slug === params.slug);

  if (!topic) {
    notFound();
    return null;
  }

  function renderScene(stepIndex: number) {
    const step = topic!.steps[stepIndex];
    switch (topic!.slug) {
      case "arrays":
        return <ArrayScene state={step.state as any} />;
      case "stacks":
        return <StackScene state={step.state as any} />;
      case "linked-lists":
        return <LinkedListScene state={step.state as any} />;
      case "trees":
        return <TreeScene state={step.state as any} />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/topics" className="text-sm text-fg-muted hover:text-fg">← All topics</Link>
        <h1 className="mt-2 font-display text-2xl text-fg sm:text-3xl">{topic.title}</h1>
        <p className="mt-1 text-sm text-fg-muted">{topic.summary}</p>
      </div>

      <TheoryPanel theory={topic.theory} />

      <ConceptPlayer
        steps={topic.steps.map((s) => ({ title: s.title, description: s.description }))}
        renderScene={renderScene}
      />

      <div>
        <h2 className="mb-3 font-display text-xl text-fg">Test yourself</h2>
        <TopicQuiz questions={topic.quiz} />
      </div>
    </div>
  );
}
