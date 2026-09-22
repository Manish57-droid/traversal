import { withDefaultSteps, type ConceptTopic, type Step } from "./types";

export interface StringStepState {
  chars: string[];
  activeIndices: number[];
  status: "comparing" | "match" | "mismatch";
  note: string;
}

function generateSteps(input: Record<string, string>): Step<StringStepState>[] {
  const text = input.text ?? "";
  const pattern = input.pattern ?? "";
  const chars = text.split("");

  const steps: Step<StringStepState>[] = [
    {
      title: "The string",
      description: "A string is just an array of characters — the same index-access rules apply.",
      state: { chars, activeIndices: [], status: "comparing", note: `Searching for "${pattern}" in a ${chars.length}-character string.` },
    },
  ];

  if (pattern.length === 0 || chars.length === 0 || pattern.length > chars.length) {
    steps.push({
      title: "Nothing to compare",
      description: "The pattern needs to be shorter than or equal to the text to fit anywhere.",
      state: { chars, activeIndices: [], status: "mismatch", note: pattern.length === 0 ? "Enter a pattern to search for." : "Pattern is longer than the text." },
    });
    return steps;
  }

  // Naive (brute-force) substring search — one step per candidate
  // start position, not per character comparison, so the walkthrough
  // stays a manageable length even for longer strings.
  let foundAt = -1;
  for (let start = 0; start <= chars.length - pattern.length; start++) {
    const window = chars.slice(start, start + pattern.length).join("");
    const windowIndices = Array.from({ length: pattern.length }, (_, k) => start + k);
    const isMatch = window === pattern;

    let note: string;
    if (isMatch) {
      note = `"${window}" matches "${pattern}" — found at index ${start}.`;
    } else {
      let diffAt = 0;
      while (diffAt < pattern.length && window[diffAt] === pattern[diffAt]) diffAt++;
      note = `"${window}" vs "${pattern}" — differs at position ${diffAt} ('${window[diffAt] ?? ""}' ≠ '${pattern[diffAt] ?? ""}').`;
    }

    steps.push({
      title: start === 0 ? "Try position 0" : isMatch ? "Found it" : `Try position ${start}`,
      description: isMatch
        ? "The whole window matches the pattern character by character."
        : "Slide the pattern one position to the right and compare again — this is what makes naive search O(n·m).",
      state: { chars, activeIndices: windowIndices, status: isMatch ? "match" : "mismatch", note },
    });

    if (isMatch) {
      foundAt = start;
      break;
    }
  }

  if (foundAt === -1) {
    steps.push({
      title: "Not found",
      description: "Every possible starting position was tried without a full match.",
      state: { chars, activeIndices: [], status: "mismatch", note: `"${pattern}" doesn't occur in this string.` },
    });
  }

  return steps;
}

export const stringTopic: ConceptTopic<StringStepState> = withDefaultSteps({
  slug: "strings",
  title: "String",
  summary: "Naive pattern search — slide the pattern across the text one position at a time.",
  theory: {
    definition:
      "A string is a sequence (array) of characters. Most array intuition transfers directly — indexing, slicing, and iterating all work the same way, just over characters instead of numbers.",
    operations: [
      { name: "Access a character by index", complexity: "O(1)" },
      { name: "Naive substring search", complexity: "O(n·m)" },
      { name: "Substring search (KMP / Z-algorithm)", complexity: "O(n + m)" },
      { name: "Concatenation (immutable strings)", complexity: "O(n)" },
    ],
    useCases: [
      "Text search and \"find in page\"",
      "Parsing — tokenizing source code, log lines, user input",
      "Validation (matching against a pattern or format)",
      "The foundation for more advanced string algorithms (KMP, tries, suffix arrays)",
    ],
  },
  inputFields: [
    { key: "text", label: "Text", type: "text", placeholder: "abcabcabd", help: "The string to search within." },
    { key: "pattern", label: "Pattern", type: "text", placeholder: "abcabd", help: "The substring to look for." },
  ],
  defaultInput: { text: "abcabcabd", pattern: "abcabd" },
  generateSteps,
  quiz: [
    {
      question: "Why is naive substring search O(n·m) in the worst case?",
      options: [
        "It only checks the first character of each window",
        "For each of the n possible start positions, it may compare up to m characters",
        "It sorts the string first",
        "It uses recursion, which is always O(n·m)",
      ],
      correctIndex: 1,
    },
    {
      question: "When the pattern doesn't match at a given start position, naive search:",
      options: [
        "Gives up immediately",
        "Restarts the whole text from scratch",
        "Slides the pattern one position to the right and tries again",
        "Skips to the end of the text",
      ],
      correctIndex: 2,
    },
    {
      question: "What kind of structure is a string, fundamentally?",
      options: ["A linked list of characters", "A hash map of characters", "An array (sequence) of characters", "A tree of characters"],
      correctIndex: 2,
    },
  ],
});
