"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
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
      <meshBasicMaterial color="#2E4033" />
    </mesh>
  );
}

function TreeNode({ pos, index, isActive, isVisited }: { pos: [number, number, number]; index: number; isActive: boolean; isVisited: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const color = isActive ? "#FF6B4A" : isVisited ? "#E8B84B" : "#17251C";

  useFrame(({ clock }) => {
    if (!isActive) return;
    const pulse = Math.sin(clock.elapsedTime * 4) * 0.5 + 0.5;
    if (materialRef.current) materialRef.current.emissiveIntensity = 0.35 + pulse * 0.4;
    if (meshRef.current) {
      const scale = 1 + pulse * 0.1;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={pos}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.38, 24, 24]} />
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          emissive={isActive || isVisited ? color : "#000000"}
          emissiveIntensity={isActive ? 0.45 : isVisited ? 0.2 : 0}
          roughness={0.35}
        />
      </mesh>
      <Text position={[0, 0, 0.46]} fontSize={0.26} color={isActive || isVisited ? "#0A120D" : "#E2E8F0"}>
        {index}
      </Text>
    </group>
  );
}

export default function TreeScene({ state }: { state: TreeStepState }) {
  return (
    <Canvas camera={{ position: [0, 0.5, 8], fov: 45 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 4, 4]} intensity={40} color="#FF6B4A" />
      {EDGES.map(([from, to], i) => (
        <Edge key={i} from={POSITIONS[from]} to={POSITIONS[to]} />
      ))}
      {POSITIONS.map((pos, i) => (
        <TreeNode
          key={i}
          pos={pos}
          index={i}
          isActive={state.activeNode === i}
          isVisited={state.visited.includes(i)}
        />
      ))}
    </Canvas>
  );
}
