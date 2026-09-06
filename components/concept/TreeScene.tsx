"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { TreeStepState } from "@/lib/concepts/data";

// Fixed 7-node complete binary tree (heap-style indices: children of i
// are 2i+1 and 2i+2), positioned once and reused across every step.
const POSITIONS: [number, number, number][] = [
  [0, 2, 0],
  [-2, 0.5, 0],
  [2, 0.5, 0],
  [-3, -1, 0],
  [-1, -1, 0],
  [1, -1, 0],
  [3, -1, 0],
];

const EDGES: [number, number][] = [
  [0, 1], [0, 2],
  [1, 3], [1, 4],
  [2, 5], [2, 6],
];

function Edge({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const { mid, length, quaternion } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    return {
      mid: a.clone().add(b).multiplyScalar(0.5),
      length: dir.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize()
      ),
    };
  }, [from, to]);

  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[0.02, 0.02, length, 6]} />
      <meshBasicMaterial color="#2A2E35" />
    </mesh>
  );
}

export default function TreeScene({ state }: { state: TreeStepState }) {
  return (
    <Canvas camera={{ position: [0, 0.5, 8], fov: 45 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 4, 4]} intensity={40} color="#FF6A3D" />
      {EDGES.map(([from, to], i) => (
        <Edge key={i} from={POSITIONS[from]} to={POSITIONS[to]} />
      ))}
      {POSITIONS.map((pos, i) => {
        const isActive = state.activeNode === i;
        const isVisited = state.visited.includes(i);
        const color = isActive ? "#FF6A3D" : isVisited ? "#4CC9F0" : "#1E2226";
        return (
          <group key={i} position={pos}>
            <mesh>
              <sphereGeometry args={[0.38, 24, 24]} />
              <meshStandardMaterial
                color={color}
                emissive={isActive || isVisited ? color : "#000000"}
                emissiveIntensity={isActive ? 0.45 : isVisited ? 0.2 : 0}
                roughness={0.35}
              />
            </mesh>
            <Text position={[0, 0, 0.46]} fontSize={0.26} color={isActive || isVisited ? "#0A0B0E" : "#E2E8F0"}>
              {i}
            </Text>
          </group>
        );
      })}
    </Canvas>
  );
}
