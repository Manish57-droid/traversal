import { withDefaultSteps, parseNumberList, parseEdgeList, type ConceptTopic, type Step } from "./types";

export interface GraphStepState {
  labels: number[];
  edges: [number, number][];
  positions: [number, number, number][];
  visited: number[];
  activeNode: number | null;
  note: string;
}

/** Nodes placed evenly around a circle — simple, and guaranteed
 * non-overlapping for any node count without a real force-directed
 * layout, which would be overkill for a handful of nodes. */
function circleLayout(count: number): [number, number, number][] {
  const radius = count <= 1 ? 0 : 2.4;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2; // start at top, go clockwise
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0] as [number, number, number];
  });
}

function bfsOrder(adjacency: number[][], start: number): number[] {
  if (start < 0 || start >= adjacency.length) return [];
  const order: number[] = [];
  const seen = new Set<number>([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    order.push(cur);
    for (const next of adjacency[cur]) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return order;
}

function generateSteps(input: Record<string, string>): Step<GraphStepState>[] {
  const labels = parseNumberList(input.nodes);
  const rawEdges = parseEdgeList(input.edges).filter(([a, b]) => a >= 0 && a < labels.length && b >= 0 && b < labels.length);
  const positions = circleLayout(labels.length);

  const adjacency: number[][] = labels.map(() => []);
  const edges: [number, number][] = [];
  for (const [a, b] of rawEdges) {
    if (adjacency[a].includes(b)) continue; // dedupe
    adjacency[a].push(b);
    adjacency[b].push(a);
    edges.push([a, b]);
  }

  if (labels.length === 0) {
    return [{ title: "Empty graph", description: "Enter at least one node.", state: { labels, edges, positions, visited: [], activeNode: null, note: "No nodes given." } }];
  }

  const steps: Step<GraphStepState>[] = [
    {
      title: "The graph",
      description: `${labels.length} node${labels.length === 1 ? "" : "s"} and ${edges.length} edge${edges.length === 1 ? "" : "s"} — undirected, so every edge connects both ways.`,
      state: { labels, edges, positions, visited: [], activeNode: null, note: `Starting BFS from node ${labels[0]} (position 0).` },
    },
  ];

  const order = bfsOrder(adjacency, 0);
  const visited: number[] = [];
  order.forEach((idx, i) => {
    visited.push(idx);
    const neighbors = adjacency[idx].map((n) => labels[n]).join(", ") || "none";
    steps.push({
      title: i === 0 ? "Visit the start node" : "Next in the queue",
      description: i === 0 ? "BFS starts at the given node and enqueues all of its neighbors." : "Dequeue the next node and enqueue any of its neighbors not seen yet.",
      state: { labels, edges, positions, visited: [...visited], activeNode: idx, note: `Visit ${labels[idx]} — neighbors: ${neighbors}.${i === order.length - 1 ? " Queue empty, traversal complete." : ""}` },
    });
  });

  const unreached = labels.length - order.length;
  if (unreached > 0) {
    steps.push({
      title: "Unreachable nodes",
      description: "BFS only visits what it can reach from the start — a disconnected graph leaves some nodes untouched.",
      state: { labels, edges, positions, visited: [...visited], activeNode: null, note: `${unreached} node${unreached === 1 ? "" : "s"} never reached — not connected to the start node.` },
    });
  }

  return steps;
}

export const graphTopic: ConceptTopic<GraphStepState> = withDefaultSteps({
  slug: "graphs",
  title: "Graph",
  summary: "Breadth-first search over your own nodes and edges, starting from the first node.",
  theory: {
    definition:
      "A set of nodes (vertices) connected by edges. Unlike a tree, a graph can have cycles and a node can connect to any number of others — this visualizer builds an undirected graph, so every edge is two-way.",
    operations: [
      { name: "BFS / DFS traversal", complexity: "O(V + E)" },
      { name: "Add an edge", complexity: "O(1)" },
      { name: "Check if two nodes are connected (adjacency list)", complexity: "O(degree of node)" },
    ],
    useCases: [
      "Social networks and friend/follow relationships",
      "Maps and routing — shortest path between two points",
      "Dependency graphs (build systems, package managers)",
      "Network topology and connectivity checks",
    ],
  },
  inputFields: [
    { key: "nodes", label: "Nodes", type: "numberList", placeholder: "0, 1, 2, 3, 4", help: "Comma-separated node labels." },
    { key: "edges", label: "Edges", type: "edgeList", placeholder: "0-1, 0-2, 1-3, 2-3, 3-4", help: "Pairs of positions in the node list above, e.g. 0-1 connects the 1st and 2nd node." },
  ],
  defaultInput: { nodes: "0, 1, 2, 3, 4", edges: "0-1, 0-2, 1-3, 2-3, 3-4" },
  generateSteps,
  quiz: [
    {
      question: "How is a graph different from a tree?",
      options: [
        "A graph can have cycles and nodes with multiple parents; a tree can't",
        "A graph can only have one node",
        "Trees allow cycles, graphs don't",
        "There's no real difference",
      ],
      correctIndex: 0,
    },
    {
      question: "What does BFS do when it reaches a node with neighbors it has already visited?",
      options: ["Visits them again", "Skips them — each node is only visited once", "Stops immediately", "Restarts from the beginning"],
      correctIndex: 1,
    },
    {
      question: "Why might BFS from a given start node not visit every node in the graph?",
      options: [
        "BFS is broken for graphs",
        "The graph might be disconnected — some nodes simply aren't reachable from the start",
        "BFS only works on trees",
        "There must be a cycle",
      ],
      correctIndex: 1,
    },
  ],
});
