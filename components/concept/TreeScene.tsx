"use client";

import { Edge, GraphNode, NodeEdgeCanvas } from "./NodeEdgeScene";
import type { TreeStepState } from "@/lib/concepts/data";

export default function TreeScene({ state }: { state: TreeStepState }) {
  return (
    <NodeEdgeCanvas cameraZ={Math.max(8, state.values.length * 0.9)} lightColor="#FF6B4A">
      {state.edges.map(([from, to], i) => (
        <Edge key={i} from={state.positions[from]} to={state.positions[to]} />
      ))}
      {state.positions.map((pos, i) =>
        pos ? (
          <GraphNode
            key={i}
            pos={pos}
            label={state.values[i]}
            isActive={state.activeNode === i}
            isVisited={state.visited.includes(i)}
            color="#E8B84B"
          />
        ) : null
      )}
    </NodeEdgeCanvas>
  );
}
