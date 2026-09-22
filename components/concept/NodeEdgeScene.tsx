"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

// Shared node-and-edge renderer behind both TreeScene and GraphScene —
// both are "some nodes, some edges, a visited set, an active node",
// just with different data prep (BST layout vs. a circle of nodes).

export function Edge({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const { mid, length, quaternion } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    return {
      mid: a.clone().add(b).multiplyScalar(0.5),
      length: dir.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
    };
  }, [from, to]);

  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[0.02, 0.02, length, 6]} />
      <meshBasicMaterial color="#2E4033" />
    </mesh>
  );
}

export function GraphNode({
  pos,
  label,
  isActive,
  isVisited,
  color,
}: {
  pos: [number, number, number];
  label: number;
  isActive: boolean;
  isVisited: boolean;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const fill = isActive ? "#FF6B4A" : isVisited ? color : "#17251C";

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
        <meshStandardMaterial ref={materialRef} color={fill} emissive={isActive || isVisited ? fill : "#000000"} emissiveIntensity={isActive ? 0.45 : isVisited ? 0.2 : 0} roughness={0.35} />
      </mesh>
      <Text position={[0, 0, 0.46]} fontSize={0.26} color={isActive || isVisited ? "#0A120D" : "#E2E8F0"}>
        {label}
      </Text>
    </group>
  );
}

export function NodeEdgeCanvas({
  cameraZ = 8,
  lightColor,
  children,
}: {
  cameraZ?: number;
  lightColor: string;
  children: React.ReactNode;
}) {
  return (
    <Canvas camera={{ position: [0, 0.3, cameraZ], fov: 45 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 4, 4]} intensity={40} color={lightColor} />
      {children}
    </Canvas>
  );
}
