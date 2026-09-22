"use client";

import { Edge, GraphNode, NodeEdgeCanvas } from "./NodeEdgeScene";
import type { GraphStepState } from "@/lib/concepts/data";

export default function GraphScene({ state }: { state: GraphStepState }) {
  return (
    <NodeEdgeCanvas cameraZ={7} lightColor="#D9824C">
      {state.edges.map(([from, to], i) => (
        <Edge key={i} from={state.positions[from]} to={state.positions[to]} />
      ))}
      {state.positions.map((pos, i) => (
        <GraphNode
          key={i}
          pos={pos}
          label={state.labels[i]}
          isActive={state.activeNode === i}
          isVisited={state.visited.includes(i)}
          color="#D9824C"
        />
      ))}
    </NodeEdgeCanvas>
  );
}
