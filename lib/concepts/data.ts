// Static content for the "Topics" reading section — each topic is a
// fixed sequence of steps that ConceptPlayer walks through, driving a
// 3D scene specific to that data structure. No DB table: this is
// authored content, not user data.

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

export interface ConceptTopic<TState> {
  slug: string;
  title: string;
  summary: string;
  steps: { title: string; description: string; state: TState }[];
}

export const arrayTopic: ConceptTopic<ArrayStepState> = {
  slug: "arrays",
  title: "Arrays",
  summary: "Linear search over a fixed-size, contiguous block of memory — one comparison at a time.",
  steps: [
    { title: "The array", description: "An array stores elements in contiguous memory, each reachable in O(1) by index.", state: { values: [4, 2, 7, 1, 9, 3], activeIndices: [], note: "6 elements, indices 0 to 5." } },
    { title: "Start the search", description: "Say we're searching for the value 9. We start at index 0.", state: { values: [4, 2, 7, 1, 9, 3], activeIndices: [0], note: "Is 4 equal to 9? No." } },
    { title: "Move forward", description: "Since it didn't match, we move to the next index.", state: { values: [4, 2, 7, 1, 9, 3], activeIndices: [1], note: "Is 2 equal to 9? No." } },
    { title: "Keep scanning", description: "Each step costs one comparison — that's what makes this O(n).", state: { values: [4, 2, 7, 1, 9, 3], activeIndices: [2], note: "Is 7 equal to 9? No." } },
    { title: "Still looking", description: "We haven't found it yet, so we continue.", state: { values: [4, 2, 7, 1, 9, 3], activeIndices: [3], note: "Is 1 equal to 9? No." } },
    { title: "Found it", description: "Index 4 matches — the search stops here in the worst case after n comparisons.", state: { values: [4, 2, 7, 1, 9, 3], activeIndices: [4], note: "Is 9 equal to 9? Yes — found at index 4." } },
  ],
};

export const stackTopic: ConceptTopic<StackStepState> = {
  slug: "stacks",
  title: "Stacks",
  summary: "Last in, first out — the only two moves are push and pop, both O(1).",
  steps: [
    { title: "Empty stack", description: "A stack only lets you add or remove from the top.", state: { stack: [], action: "idle", note: "Nothing on the stack yet." } },
    { title: "Push 3", description: "Pushing adds a new element on top.", state: { stack: [3], action: "push", note: "Stack: [3]" } },
    { title: "Push 7", description: "The new top is whatever we pushed most recently.", state: { stack: [3, 7], action: "push", note: "Stack: [3, 7]" } },
    { title: "Push 5", description: "We keep stacking on top — each push is O(1).", state: { stack: [3, 7, 5], action: "push", note: "Stack: [3, 7, 5]" } },
    { title: "Pop", description: "Popping removes and returns the top element — the most recently added one.", state: { stack: [3, 7], action: "pop", note: "Popped 5. Stack: [3, 7]" } },
    { title: "Peek", description: "You can look at the top without removing it.", state: { stack: [3, 7], action: "peek", note: "Top is 7, stack unchanged." } },
  ],
};

export const linkedListTopic: ConceptTopic<LinkedListStepState> = {
  slug: "linked-lists",
  title: "Linked Lists",
  summary: "Nodes scattered in memory, connected one-way by pointers — traversal is the core skill.",
  steps: [
    { title: "The list", description: "Each node holds a value and a pointer to the next node — there's no random access like an array.", state: { values: [8, 3, 6, 2], activeIndex: null, note: "Head points to the first node." } },
    { title: "Start at head", description: "Traversal always begins at the head pointer.", state: { values: [8, 3, 6, 2], activeIndex: 0, note: "Current node: 8" } },
    { title: "Follow next", description: "We follow the current node's `next` pointer to move forward.", state: { values: [8, 3, 6, 2], activeIndex: 1, note: "Current node: 3" } },
    { title: "Keep following", description: "There's no way to jump ahead — every node must be visited in order.", state: { values: [8, 3, 6, 2], activeIndex: 2, note: "Current node: 6" } },
    { title: "Reach the tail", description: "The last node's `next` pointer is null, which is how we know traversal is done.", state: { values: [8, 3, 6, 2], activeIndex: 3, note: "Current node: 2 — next is null." } },
  ],
};

export const treeTopic: ConceptTopic<TreeStepState> = {
  slug: "trees",
  title: "Trees",
  summary: "A breadth-first traversal of a binary tree, visiting level by level using a queue.",
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
};

export const CONCEPT_TOPICS = [arrayTopic, stackTopic, linkedListTopic, treeTopic];
