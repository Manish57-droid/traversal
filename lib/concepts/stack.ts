import { withDefaultSteps, type ConceptTopic, type Step } from "./types";

export interface StackStepState {
  stack: number[];
  action: "push" | "pop" | "peek" | "idle";
  note: string;
}

type Op = { op: "push"; value: number } | { op: "pop" } | { op: "peek" };

function parseOps(raw: string | undefined): Op[] {
  return (raw ?? "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token): Op | null => {
      const pushMatch = token.match(/^push\s+(-?\d+(?:\.\d+)?)$/i);
      if (pushMatch) return { op: "push", value: Number(pushMatch[1]) };
      if (/^pop$/i.test(token)) return { op: "pop" };
      if (/^peek$/i.test(token)) return { op: "peek" };
      return null;
    })
    .filter((op): op is Op => op !== null);
}

function generateSteps(input: Record<string, string>): Step<StackStepState>[] {
  const ops = parseOps(input.operations);
  const steps: Step<StackStepState>[] = [
    { title: "Empty stack", description: "A stack only lets you add or remove from the top.", state: { stack: [], action: "idle", note: "Nothing on the stack yet." } },
  ];

  let stack: number[] = [];
  for (const op of ops) {
    if (op.op === "push") {
      stack = [...stack, op.value];
      steps.push({
        title: `Push ${op.value}`,
        description: "Pushing adds a new element on top — O(1), no shifting needed.",
        state: { stack, action: "push", note: `Stack: [${stack.join(", ")}]` },
      });
    } else if (op.op === "pop") {
      if (stack.length === 0) {
        steps.push({ title: "Pop on empty stack", description: "There's nothing to pop.", state: { stack, action: "idle", note: "Stack is empty — pop has nothing to remove." } });
        continue;
      }
      const popped = stack[stack.length - 1];
      stack = stack.slice(0, -1);
      steps.push({
        title: "Pop",
        description: "Popping removes and returns the top element — the most recently added one.",
        state: { stack, action: "pop", note: `Popped ${popped}. Stack: [${stack.join(", ")}]` },
      });
    } else {
      if (stack.length === 0) {
        steps.push({ title: "Peek on empty stack", description: "There's nothing on top to look at.", state: { stack, action: "idle", note: "Stack is empty." } });
        continue;
      }
      steps.push({
        title: "Peek",
        description: "You can look at the top without removing it.",
        state: { stack, action: "peek", note: `Top is ${stack[stack.length - 1]}, stack unchanged.` },
      });
    }
  }

  return steps;
}

export const stackTopic: ConceptTopic<StackStepState> = withDefaultSteps({
  slug: "stacks",
  title: "Stack",
  summary: "Last in, first out — the only two moves are push and pop, both O(1).",
  theory: {
    definition:
      "A Last-In-First-Out (LIFO) structure where you can only add or remove from one end, called the top.",
    operations: [
      { name: "Push (add to top)", complexity: "O(1)" },
      { name: "Pop (remove from top)", complexity: "O(1)" },
      { name: "Peek (look at top)", complexity: "O(1)" },
      { name: "Search for an arbitrary element", complexity: "O(n)" },
    ],
    useCases: [
      "The function call stack behind recursion",
      "Undo/redo history in editors",
      "Matching brackets and parsing expressions",
      "Depth-first search (DFS) on graphs and trees",
    ],
  },
  inputFields: [
    {
      key: "operations",
      label: "Operations",
      type: "text",
      placeholder: "push 3, push 7, push 5, pop, peek",
      help: "Comma-separated: push <number>, pop, or peek.",
    },
  ],
  defaultInput: { operations: "push 3, push 7, push 5, pop, peek" },
  generateSteps,
  quiz: [
    {
      question: "What does LIFO stand for?",
      options: ["Last In, First Out", "Least In, First Out", "Last In, Final Order", "Linked In, First Out"],
      correctIndex: 0,
    },
    {
      question: "After pushing 3, 7, then 5 onto an empty stack, what does pop() return?",
      options: ["3", "7", "5", "The stack is empty"],
      correctIndex: 2,
    },
    {
      question: "Which real-world mechanism is a stack most directly behind?",
      options: ["A printer queue", "The undo button and the function call stack", "A round-robin scheduler", "A hash table"],
      correctIndex: 1,
    },
  ],
});
