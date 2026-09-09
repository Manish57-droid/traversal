// Static content for the "Topics" reading section — each topic is a
// fixed sequence of steps that ConceptPlayer walks through, driving a
// 3D scene specific to that data structure, plus a short theory
// write-up and a 3-question recap quiz. No DB table: this is authored
// content, not user data.

export interface ArrayStepState {
  values: number[];
  activeIndices: number[];
  note: string;
}

export interface StackStepState {
  stack: number[];
  action: "push" | "pop" | "peek" | "idle";
  note: string;
}

export interface LinkedListStepState {
  values: number[];
  activeIndex: number | null;
  note: string;
}

export interface TreeStepState {
  // static 7-node complete binary tree, 0 = root
  visited: number[];
  activeNode: number | null;
  note: string;
}

export interface ConceptTheory {
  definition: string;
  operations: { name: string; complexity: string }[];
  useCases: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface ConceptTopic<TState> {
  slug: string;
  title: string;
  summary: string;
  theory: ConceptTheory;
  steps: { title: string; description: string; state: TState }[];
  quiz: QuizQuestion[];
}

export const arrayTopic: ConceptTopic<ArrayStepState> = {
  slug: "arrays",
  title: "Arrays",
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
  steps: [
    { title: "The array", description: "An array stores elements in contiguous memory, each reachable in O(1) by index.", state: { values: [4, 2, 7, 1, 9, 3], activeIndices: [], note: "6 elements, indices 0 to 5." } },
    { title: "Start the search", description: "Say we're searching for the value 9. We start at index 0.", state: { values: [4, 2, 7, 1, 9, 3], activeIndices: [0], note: "Is 4 equal to 9? No." } },
    { title: "Move forward", description: "Since it didn't match, we move to the next index.", state: { values: [4, 2, 7, 1, 9, 3], activeIndices: [1], note: "Is 2 equal to 9? No." } },
    { title: "Keep scanning", description: "Each step costs one comparison — that's what makes this O(n).", state: { values: [4, 2, 7, 1, 9, 3], activeIndices: [2], note: "Is 7 equal to 9? No." } },
    { title: "Still looking", description: "We haven't found it yet, so we continue.", state: { values: [4, 2, 7, 1, 9, 3], activeIndices: [3], note: "Is 1 equal to 9? No." } },
    { title: "Found it", description: "Index 4 matches — the search stops here in the worst case after n comparisons.", state: { values: [4, 2, 7, 1, 9, 3], activeIndices: [4], note: "Is 9 equal to 9? Yes — found at index 4." } },
  ],
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
};

export const stackTopic: ConceptTopic<StackStepState> = {
  slug: "stacks",
  title: "Stacks",
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
  steps: [
    { title: "Empty stack", description: "A stack only lets you add or remove from the top.", state: { stack: [], action: "idle", note: "Nothing on the stack yet." } },
    { title: "Push 3", description: "Pushing adds a new element on top.", state: { stack: [3], action: "push", note: "Stack: [3]" } },
    { title: "Push 7", description: "The new top is whatever we pushed most recently.", state: { stack: [3, 7], action: "push", note: "Stack: [3, 7]" } },
    { title: "Push 5", description: "We keep stacking on top — each push is O(1).", state: { stack: [3, 7, 5], action: "push", note: "Stack: [3, 7, 5]" } },
    { title: "Pop", description: "Popping removes and returns the top element — the most recently added one.", state: { stack: [3, 7], action: "pop", note: "Popped 5. Stack: [3, 7]" } },
    { title: "Peek", description: "You can look at the top without removing it.", state: { stack: [3, 7], action: "peek", note: "Top is 7, stack unchanged." } },
  ],
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
};

export const linkedListTopic: ConceptTopic<LinkedListStepState> = {
  slug: "linked-lists",
  title: "Linked Lists",
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
  steps: [
    { title: "The list", description: "Each node holds a value and a pointer to the next node — there's no random access like an array.", state: { values: [8, 3, 6, 2], activeIndex: null, note: "Head points to the first node." } },
    { title: "Start at head", description: "Traversal always begins at the head pointer.", state: { values: [8, 3, 6, 2], activeIndex: 0, note: "Current node: 8" } },
    { title: "Follow next", description: "We follow the current node's `next` pointer to move forward.", state: { values: [8, 3, 6, 2], activeIndex: 1, note: "Current node: 3" } },
    { title: "Keep following", description: "There's no way to jump ahead — every node must be visited in order.", state: { values: [8, 3, 6, 2], activeIndex: 2, note: "Current node: 6" } },
    { title: "Reach the tail", description: "The last node's `next` pointer is null, which is how we know traversal is done.", state: { values: [8, 3, 6, 2], activeIndex: 3, note: "Current node: 2 — next is null." } },
  ],
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
};

export const treeTopic: ConceptTopic<TreeStepState> = {
  slug: "trees",
  title: "Trees",
  summary: "A breadth-first traversal of a binary tree, visiting level by level using a queue.",
  theory: {
    definition:
      "A hierarchical structure of nodes with a single root, where every node has at most a fixed number of children and there are no cycles.",
    operations: [
      { name: "Search / insert / delete (balanced)", complexity: "O(log n)" },
      { name: "Search / insert / delete (unbalanced, worst case)", complexity: "O(n)" },
      { name: "Traverse every node", complexity: "O(n)" },
    ],
    useCases: [
      "File systems and folder hierarchies",
      "Binary search trees for fast sorted lookups",
      "Heaps and priority queues",
      "Decision trees and parsing (e.g. syntax trees)",
    ],
  },
  steps: [
    { title: "The tree", description: "A complete binary tree with 7 nodes — each parent has up to two children.", state: { visited: [], activeNode: null, note: "Root is node 0." } },
    { title: "Visit the root", description: "BFS starts at the root and enqueues its children.", state: { visited: [0], activeNode: 0, note: "Visit 0, enqueue its two children." } },
    { title: "Level 1, left", description: "We dequeue the next node in line — the root's left child.", state: { visited: [0, 1], activeNode: 1, note: "Visit node 1, enqueue its children." } },
    { title: "Level 1, right", description: "Then the root's right child.", state: { visited: [0, 1, 2], activeNode: 2, note: "Visit node 2, enqueue its children." } },
    { title: "Level 2, leftmost", description: "BFS finishes a whole level before moving to the next.", state: { visited: [0, 1, 2, 3], activeNode: 3, note: "Visit node 3." } },
    { title: "Level 2, continuing", description: "Continuing left to right across the last level.", state: { visited: [0, 1, 2, 3, 4], activeNode: 4, note: "Visit node 4." } },
    { title: "Nearly done", description: "Two nodes left in the queue.", state: { visited: [0, 1, 2, 3, 4, 5], activeNode: 5, note: "Visit node 5." } },
    { title: "Traversal complete", description: "Every node visited level by level: 0, 1, 2, 3, 4, 5, 6.", state: { visited: [0, 1, 2, 3, 4, 5, 6], activeNode: 6, note: "Visit node 6 — queue is empty, done." } },
  ],
  quiz: [
    {
      question: "What order does BFS visit nodes in?",
      options: ["Deepest first", "Level by level, left to right", "Right to left, bottom-up", "Randomly"],
      correctIndex: 1,
    },
    {
      question: "What data structure does BFS use to keep track of what to visit next?",
      options: ["A stack", "A queue", "A hash map", "Nothing — it's recursive only"],
      correctIndex: 1,
    },
    {
      question: "Why can search in an unbalanced binary tree degrade to O(n)?",
      options: [
        "Because trees can't be searched",
        "Because a heavily lopsided tree behaves like a straight line, no better than a linked list",
        "Because BFS always visits every node anyway",
        "Because unbalanced trees don't have a root",
      ],
      correctIndex: 1,
    },
  ],
};

export const CONCEPT_TOPICS = [arrayTopic, stackTopic, linkedListTopic, treeTopic];
