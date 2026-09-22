import { withDefaultSteps, parseNumberList, parseSingleNumber, type ConceptTopic, type Step } from "./types";

export interface ArrayStepState {
  values: number[];
  activeIndices: number[];
  note: string;
}

function generateSteps(input: Record<string, string>): Step<ArrayStepState>[] {
  const values = parseNumberList(input.values);
  const target = parseSingleNumber(input.target);
  const steps: Step<ArrayStepState>[] = [
    {
      title: "The array",
      description: "An array stores elements in contiguous memory, each reachable in O(1) by index.",
      state: { values, activeIndices: [], note: `${values.length} element${values.length === 1 ? "" : "s"}, indices 0 to ${Math.max(0, values.length - 1)}.` },
    },
  ];

  if (values.length === 0) {
    steps.push({ title: "Nothing to search", description: "Enter at least one value to search through.", state: { values, activeIndices: [], note: "Empty array." } });
    return steps;
  }

  let foundAt = -1;
  for (let i = 0; i < values.length; i++) {
    const isMatch = values[i] === target;
    steps.push({
      title: i === 0 ? "Start the search" : isMatch ? "Found it" : "Keep scanning",
      description:
        i === 0
          ? `Say we're searching for the value ${target}. We start at index 0.`
          : "Each step costs one comparison — that's what makes this O(n).",
      state: { values, activeIndices: [i], note: `Is ${values[i]} equal to ${target}? ${isMatch ? `Yes — found at index ${i}.` : "No."}` },
    });
    if (isMatch) {
      foundAt = i;
      break;
    }
  }

  if (foundAt === -1) {
    steps.push({
      title: "Not found",
      description: `We checked every element without a match — that's the worst case, all n comparisons.`,
      state: { values, activeIndices: [], note: `${target} isn't in this array.` },
    });
  }

  return steps;
}

export const arrayTopic: ConceptTopic<ArrayStepState> = withDefaultSteps({
  slug: "arrays",
  title: "Array",
  summary: "Linear search over a fixed-size, contiguous block of memory — one comparison at a time.",
  theory: {
    definition:
      "A contiguous block of memory holding elements of the same type, each one reachable directly by its index.",
    operations: [
      { name: "Access by index", complexity: "O(1)" },
      { name: "Search (unsorted)", complexity: "O(n)" },
      { name: "Search (sorted, binary search)", complexity: "O(log n)" },
      { name: "Insert / delete at end", complexity: "O(1)" },
      { name: "Insert / delete in middle", complexity: "O(n)" },
    ],
    useCases: [
      "Lookup tables and buffers",
      "Representing matrices and grids",
      "The backing storage for stacks, queues, and hash tables",
      "Any time you need fast index-based access",
    ],
  },
  inputFields: [
    { key: "values", label: "Array values", type: "numberList", placeholder: "4, 2, 7, 1, 9, 3", help: "Comma-separated numbers." },
    { key: "target", label: "Search for", type: "number", placeholder: "9", help: "The value to linear-search for." },
  ],
  defaultInput: { values: "4, 2, 7, 1, 9, 3", target: "9" },
  generateSteps,
  quiz: [
    {
      question: "What's the time complexity of accessing element at a known index in an array?",
      options: ["O(1)", "O(n)", "O(log n)", "O(n²)"],
      correctIndex: 0,
    },
    {
      question: "Why does linear search take O(n) in the worst case?",
      options: [
        "Because arrays are unsorted by default",
        "Because it may have to check every element once before finding a match (or concluding it isn't there)",
        "Because array access itself is slow",
        "Because it uses recursion",
      ],
      correctIndex: 1,
    },
    {
      question: "Inserting a new element in the middle of an array is expensive because:",
      options: [
        "The array has to be sorted first",
        "Every element after it has to shift over to make room",
        "Arrays don't support insertion at all",
        "It requires converting the array to a linked list",
      ],
      correctIndex: 1,
    },
  ],
});
