import { withDefaultSteps, parseNumberList, type ConceptTopic, type Step } from "./types";

export interface TreeStepState {
  values: number[];
  edges: [number, number][];
  positions: [number, number, number][];
  visited: number[];
  activeNode: number | null;
  note: string;
}

interface BSTNode {
  value: number;
  left: number;
  right: number;
}

/** Standard BST insertion, in the order values are given. Duplicate
 * values are skipped (a BST has no defined place for a repeat). */
function buildBST(values: number[]): { nodes: BSTNode[]; root: number } {
  const nodes: BSTNode[] = [];
  let root = -1;

  for (const value of values) {
    if (nodes.some((n) => n.value === value)) continue;
    const index = nodes.length;
    nodes.push({ value, left: -1, right: -1 });
    if (root === -1) {
      root = index;
      continue;
    }
    let cur = root;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (value < nodes[cur].value) {
        if (nodes[cur].left === -1) {
          nodes[cur].left = index;
          break;
        }
        cur = nodes[cur].left;
      } else {
        if (nodes[cur].right === -1) {
          nodes[cur].right = index;
          break;
        }
        cur = nodes[cur].right;
      }
    }
  }

  return { nodes, root };
}

/** In-order x-position layout: visiting left-subtree, self, right-
 * subtree in that order and incrementing an x counter each time
 * guarantees no two nodes ever overlap horizontally, for any BST
 * shape — a standard, simple tree-drawing technique. */
function layoutPositions(nodes: BSTNode[], root: number): [number, number, number][] {
  const positions: [number, number, number][] = new Array(nodes.length);
  if (root === -1) return positions;

  let x = 0;
  const SPACING_X = 1.3;
  const SPACING_Y = 1.15;

  function walk(index: number, depth: number) {
    if (index === -1) return;
    walk(nodes[index].left, depth + 1);
    positions[index] = [x * SPACING_X, -depth * SPACING_Y, 0];
    x++;
    walk(nodes[index].right, depth + 1);
  }
  walk(root, 0);

  const xs = positions.filter(Boolean).map((p) => p[0]);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const topY = 1.6; // headroom so the root sits near the top of the scene, not dead center
  return positions.map((p) => (p ? [p[0] - centerX, p[1] + topY, 0] : p));
}

function edgesFrom(nodes: BSTNode[]): [number, number][] {
  const edges: [number, number][] = [];
  nodes.forEach((n, i) => {
    if (n.left !== -1) edges.push([i, n.left]);
    if (n.right !== -1) edges.push([i, n.right]);
  });
  return edges;
}

function bfsOrder(nodes: BSTNode[], root: number): number[] {
  if (root === -1) return [];
  const order: number[] = [];
  const queue = [root];
  while (queue.length) {
    const cur = queue.shift()!;
    order.push(cur);
    if (nodes[cur].left !== -1) queue.push(nodes[cur].left);
    if (nodes[cur].right !== -1) queue.push(nodes[cur].right);
  }
  return order;
}

function generateSteps(input: Record<string, string>): Step<TreeStepState>[] {
  const inserted = parseNumberList(input.values);
  const { nodes, root } = buildBST(inserted);
  const values = nodes.map((n) => n.value);
  const edges = edgesFrom(nodes);
  const positions = layoutPositions(nodes, root);

  if (nodes.length === 0) {
    return [{ title: "Empty tree", description: "Enter at least one value to build a tree.", state: { values, edges, positions, visited: [], activeNode: null, note: "No values given." } }];
  }

  const skipped = inserted.length - nodes.length;
  const steps: Step<TreeStepState>[] = [
    {
      title: "The tree",
      description: `Inserting ${inserted.join(", ")} into a binary search tree, in order — each value goes left if smaller than the node it's compared to, right if larger.${skipped > 0 ? ` (${skipped} duplicate${skipped === 1 ? "" : "s"} skipped.)` : ""}`,
      state: { values, edges, positions, visited: [], activeNode: null, note: `${nodes.length} node${nodes.length === 1 ? "" : "s"}. Root is ${nodes[root].value}.` },
    },
  ];

  const order = bfsOrder(nodes, root);
  const visited: number[] = [];
  order.forEach((idx, i) => {
    visited.push(idx);
    steps.push({
      title: i === 0 ? "Visit the root" : "Next in line",
      description: i === 0 ? "BFS starts at the root and enqueues its children." : "BFS finishes a whole level before moving to the next — dequeue the next node in line.",
      state: { values, edges, positions, visited: [...visited], activeNode: idx, note: `Visit ${nodes[idx].value}${i === order.length - 1 ? " — queue is empty, traversal complete." : "."}` },
    });
  });

  return steps;
}

export const treeTopic: ConceptTopic<TreeStepState> = withDefaultSteps({
  slug: "trees",
  title: "Tree",
  summary: "Build a binary search tree from your own values, then watch a breadth-first traversal.",
  theory: {
    definition:
      "A hierarchical structure of nodes with a single root, where every node has at most a fixed number of children and there are no cycles. A binary search tree (BST) additionally keeps every left subtree smaller and every right subtree larger than its parent.",
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
  inputFields: [
    { key: "values", label: "Values to insert", type: "numberList", placeholder: "8, 3, 10, 1, 6, 14, 4, 7, 13", help: "Comma-separated numbers, inserted in order to build a BST." },
  ],
  defaultInput: { values: "8, 3, 10, 1, 6, 14, 4, 7, 13" },
  generateSteps,
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
      question: "In a binary search tree, where does a value smaller than the current node go?",
      options: ["Left subtree", "Right subtree", "It replaces the current node", "It's rejected"],
      correctIndex: 0,
    },
  ],
});
