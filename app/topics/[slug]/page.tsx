"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import ConceptPlayer from "@/components/concept/ConceptPlayer";
import TheoryPanel from "@/components/concept/TheoryPanel";
import TopicQuiz from "@/components/concept/TopicQuiz";
import TopicInputPanel from "@/components/concept/TopicInputPanel";
import ArrayScene from "@/components/concept/ArrayScene";
import StringScene from "@/components/concept/StringScene";
import HashingScene from "@/components/concept/HashingScene";
import StackScene from "@/components/concept/StackScene";
import QueueScene from "@/components/concept/QueueScene";
import LinkedListScene from "@/components/concept/LinkedListScene";
import TreeScene from "@/components/concept/TreeScene";
import GraphScene from "@/components/concept/GraphScene";
import { CONCEPT_TOPICS, type TopicInput } from "@/lib/concepts/data";

export default function TopicPage({ params }: { params: { slug: string } }) {
  const topic = CONCEPT_TOPICS.find((t) => t.slug === params.slug);

  const [steps, setSteps] = useState(topic?.steps ?? []);
  // ConceptPlayer keeps its own "current step" index internally and
  // isn't otherwise told when `steps` is replaced — without this,
  // re-running on shorter output than whatever step the student was
  // scrubbed to would leave it pointing past the end of the new array.
  // Bumping this remounts it (via `key` below) so it resets to step 0.
  const [runId, setRunId] = useState(0);

  // Reset to the canned example whenever the student navigates to a
  // different topic (client-side nav keeps this component mounted, so
  // state wouldn't otherwise reset on its own) — TopicInputPanel below
  // is also remounted via `key={topic.slug}` for the same reason.
  useEffect(() => {
    setSteps(topic?.steps ?? []);
    setRunId((id) => id + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  if (!topic) {
    notFound();
    return null;
  }

  function handleRun(nextInput: TopicInput) {
    setSteps(topic!.generateSteps(nextInput) as typeof steps);
    setRunId((id) => id + 1);
  }

  function renderScene(stepIndex: number) {
    const step = steps[stepIndex];
    if (!step) return null;
    switch (topic!.slug) {
      case "arrays":
        return <ArrayScene state={step.state as any} />;
      case "strings":
        return <StringScene state={step.state as any} />;
      case "hashing":
        return <HashingScene state={step.state as any} />;
      case "stacks":
        return <StackScene state={step.state as any} />;
      case "queues":
        return <QueueScene state={step.state as any} />;
      case "linked-lists":
        return <LinkedListScene state={step.state as any} />;
      case "trees":
        return <TreeScene state={step.state as any} />;
      case "graphs":
        return <GraphScene state={step.state as any} />;
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

      {steps.length > 0 ? (
        <ConceptPlayer
          key={runId}
          steps={steps.map((s) => ({ title: s.title, description: s.description }))}
          renderScene={renderScene}
        />
      ) : (
        <p className="card p-6 text-center text-sm text-fg-muted">Nothing to play — try running with some input below.</p>
      )}

      <TopicInputPanel key={topic.slug} fields={topic.inputFields} defaultInput={topic.defaultInput} onRun={handleRun} />

      <div>
        <h2 className="mb-3 font-display text-xl text-fg">Test yourself</h2>
        <TopicQuiz questions={topic.quiz} />
      </div>
    </div>
  );
}
