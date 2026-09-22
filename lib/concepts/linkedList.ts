import { withDefaultSteps, parseNumberList, type ConceptTopic, type Step } from "./types";

export interface LinkedListStepState {
  values: number[];
  activeIndex: number | null;
  note: string;
}

function generateSteps(input: Record<string, string>): Step<LinkedListStepState>[] {
  const values = parseNumberList(input.values);
  if (values.length === 0) {
    return [{ title: "Empty list", description: "Enter at least one value to build a list.", state: { values, activeIndex: null, note: "Empty list — head points to null." } }];
  }

  const steps: Step<LinkedListStepState>[] = [
    {
      title: "The list",
      description: "Each node holds a value and a pointer to the next node — there's no random access like an array.",
      state: { values, activeIndex: null, note: "Head points to the first node." },
    },
  ];

  for (let i = 0; i < values.length; i++) {
    steps.push({
      title: i === 0 ? "Start at head" : i === values.length - 1 ? "Reach the tail" : "Follow next",
      description:
        i === 0
          ? "Traversal always begins at the head pointer."
          : i === values.length - 1
            ? "The last node's `next` pointer is null, which is how we know traversal is done."
            : "We follow the current node's `next` pointer to move forward — there's no way to jump ahead.",
      state: { values, activeIndex: i, note: `Current node: ${values[i]}${i === values.length - 1 ? " — next is null." : ""}` },
    });
  }

  return steps;
}

export const linkedListTopic: ConceptTopic<LinkedListStepState> = withDefaultSteps({
  slug: "linked-lists",
  title: "Linked List",
  summary: "Nodes scattered in memory, connected one-way by pointers — traversal is the core skill.",
  theory: {
    definition:
      "A sequence of nodes, each holding a value and a pointer to the next node — there's no requirement that they sit next to each other in memory.",
    operations: [
      { name: "Access by index", complexity: "O(n)" },
      { name: "Insert / delete at head", complexity: "O(1)" },
      { name: "Insert / delete at tail (no tail pointer)", complexity: "O(n)" },
      { name: "Search", complexity: "O(n)" },
    ],
    useCases: [
      "Implementing stacks and queues under the hood",
      "Situations with frequent insertions/deletions and no need for random access",
      "Building blocks for more advanced structures (e.g. adjacency lists for graphs)",
      "Memory that grows without needing to resize a whole block at once",
    ],
  },
  inputFields: [
    { key: "values", label: "Node values", type: "numberList", placeholder: "8, 3, 6, 2", help: "Comma-separated numbers, head to tail." },
  ],
  defaultInput: { values: "8, 3, 6, 2" },
  generateSteps,
  quiz: [
    {
      question: "Why can't you jump straight to the 3rd node of a linked list the way you can with an array?",
      options: [
        "Linked lists don't store values",
        "There's no random access — you have to follow pointers one at a time from the head",
        "Linked lists are always sorted",
        "Nodes are deleted after being read",
      ],
      correctIndex: 1,
    },
    {
      question: "How do you know you've reached the end of a linked list while traversing it?",
      options: ["The values start repeating", "The current node's `next` pointer is null", "The list wraps back to the head", "You count exactly 10 nodes"],
      correctIndex: 1,
    },
    {
      question: "Inserting a new node right after the head is fast because:",
      options: [
        "You only need to update a couple of pointers, no shifting required",
        "Linked lists automatically sort themselves",
        "The whole list gets copied",
        "It's actually just as slow as an array insert",
      ],
      correctIndex: 0,
    },
  ],
});
