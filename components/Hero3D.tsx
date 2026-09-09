"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// A binary-tree-shaped node graph, slowly rotating — a nod to
// traversal algorithms (BFS/DFS) rather than a generic abstract mesh.
// Kept intentionally lightweight (no postprocessing) so it stays
// smooth on low-end laptops and phones.

interface TreeNode {
  position: [number, number, number];
  depth: number;
}

function buildTree(depth: number): { nodes: TreeNode[]; edges: [number, number][] } {
  const nodes: TreeNode[] = [];
  const edges: [number, number][] = [];

  function place(index: number, level: number, xMin: number, xMax: number) {
    if (level > depth) return;
    const x = (xMin + xMax) / 2;
    const y = 3 - level * 1.6;
    const z = (Math.random() - 0.5) * 0.6;
    nodes.push({ position: [x, y, z], depth: level });
    const currentIndex = nodes.length - 1;

    if (level < depth) {
      const leftIndex = nodes.length;
      place(leftIndex, level + 1, xMin, x);
      edges.push([currentIndex, leftIndex]);

      const rightIndex = nodes.length;
      place(rightIndex, level + 1, x, xMax);
      edges.push([currentIndex, rightIndex]);
    }
  }

  place(0, 0, -4, 4);
  return { nodes, edges };
}

function TreeGroup() {
  const groupRef = useRef<THREE.Group>(null);
  const { nodes, edges } = useMemo(() => buildTree(3), []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  const nodeColors = ["#FF6B4A", "#D9824C", "#E8B84B", "#FF9478"];

  return (
    <group ref={groupRef}>
      {edges.map(([from, to], i) => {
        const a = new THREE.Vector3(...nodes[from].position);
        const b = new THREE.Vector3(...nodes[to].position);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const dir = b.clone().sub(a);
        const length = dir.length();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.clone().normalize()
        );
        return (
          <mesh key={i} position={mid} quaternion={quaternion}>
            <cylinderGeometry args={[0.015, 0.015, length, 6]} />
            <meshBasicMaterial color="#2E4033" transparent opacity={0.7} />
          </mesh>
        );
      })}
      {nodes.map((node, i) => (
        <mesh key={i} position={node.position}>
          <sphereGeometry args={[0.16, 24, 24]} />
          <meshStandardMaterial
            color={nodeColors[node.depth % nodeColors.length]}
            emissive={nodeColors[node.depth % nodeColors.length]}
            emissiveIntensity={0.4}
            roughness={0.35}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function Hero3D() {
  return (
    <div className="h-full w-full" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 9], fov: 50 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={60} color="#D9824C" />
        <pointLight position={[-5, -3, 4]} intensity={40} color="#E8B84B" />
        <TreeGroup />
      </Canvas>
    </div>
  );
}
