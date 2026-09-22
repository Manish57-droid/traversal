import { withDefaultSteps, type ConceptTopic, type Step } from "./types";

export interface QueueStepState {
  queue: number[];
  action: "enqueue" | "dequeue" | "idle";
  note: string;
}

type Op = { op: "enqueue"; value: number } | { op: "dequeue" };

function parseOps(raw: string | undefined): Op[] {
  return (raw ?? "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token): Op | null => {
      const enqueueMatch = token.match(/^enqueue\s+(-?\d+(?:\.\d+)?)$/i);
      if (enqueueMatch) return { op: "enqueue", value: Number(enqueueMatch[1]) };
      if (/^dequeue$/i.test(token)) return { op: "dequeue" };
      return null;
    })
    .filter((op): op is Op => op !== null);
}

function generateSteps(input: Record<string, string>): Step<QueueStepState>[] {
  const ops = parseOps(input.operations);
  const steps: Step<QueueStepState>[] = [
    { title: "Empty queue", description: "A queue adds at the rear and removes from the front — first in, first out.", state: { queue: [], action: "idle", note: "Nothing in the queue yet." } },
  ];

  let queue: number[] = [];
  for (const op of ops) {
    if (op.op === "enqueue") {
      queue = [...queue, op.value];
      steps.push({
        title: `Enqueue ${op.value}`,
        description: "Enqueuing adds a new element at the rear — O(1), the front is untouched.",
        state: { queue, action: "enqueue", note: `Queue: [${queue.join(", ")}] (front → rear)` },
      });
    } else {
      if (queue.length === 0) {
        steps.push({ title: "Dequeue on empty queue", description: "There's nothing to dequeue.", state: { queue, action: "idle", note: "Queue is empty — dequeue has nothing to remove." } });
        continue;
      }
      const removed = queue[0];
      queue = queue.slice(1);
      steps.push({
        title: "Dequeue",
        description: "Dequeuing removes and returns the front element — the one that's been waiting longest.",
        state: { queue, action: "dequeue", note: `Dequeued ${removed}. Queue: [${queue.join(", ")}]` },
      });
    }
  }

  return steps;
}

export const queueTopic: ConceptTopic<QueueStepState> = withDefaultSteps({
  slug: "queues",
  title: "Queue",
  summary: "First in, first out — enqueue at the rear, dequeue from the front, both O(1).",
  theory: {
    definition:
      "A First-In-First-Out (FIFO) structure where new elements join at the rear and only the front element can be removed.",
    operations: [
      { name: "Enqueue (add at rear)", complexity: "O(1)" },
      { name: "Dequeue (remove from front)", complexity: "O(1)" },
      { name: "Peek at front", complexity: "O(1)" },
      { name: "Search for an arbitrary element", complexity: "O(n)" },
    ],
    useCases: [
      "Task/job scheduling and print queues",
      "Breadth-first search (BFS) on graphs and trees",
      "Buffering — request handling, message queues, I/O streams",
      "Any \"first come, first served\" ordering",
    ],
  },
  inputFields: [
    {
      key: "operations",
      label: "Operations",
      type: "text",
      placeholder: "enqueue 3, enqueue 7, enqueue 5, dequeue",
      help: "Comma-separated: enqueue <number>, or dequeue.",
    },
  ],
  defaultInput: { operations: "enqueue 3, enqueue 7, enqueue 5, dequeue" },
  generateSteps,
  quiz: [
    {
      question: "What does FIFO stand for?",
      options: ["First In, First Out", "Final In, First Out", "First In, Final Order", "Fixed In, Fixed Out"],
      correctIndex: 0,
    },
    {
      question: "After enqueuing 3, 7, then 5, what does dequeue() return?",
      options: ["5", "7", "3", "The queue is empty"],
      correctIndex: 2,
    },
    {
      question: "Which classic algorithm relies on a queue to visit nodes level by level?",
      options: ["Depth-first search (DFS)", "Breadth-first search (BFS)", "Binary search", "Quicksort"],
      correctIndex: 1,
    },
  ],
});
