"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { HashingStepState } from "@/lib/concepts/data";

function Item({ x, y, value, active }: { x: number; y: number; value: number; active: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!active) return;
    const pulse = Math.sin(clock.elapsedTime * 4) * 0.5 + 0.5;
    if (materialRef.current) materialRef.current.emissiveIntensity = 0.3 + pulse * 0.35;
  });

  return (
    <group position={[x, y, 0]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.7, 0.5, 0.6]} />
        <meshStandardMaterial ref={materialRef} color={active ? "#FF6B4A" : "#17251C"} emissive={active ? "#FF6B4A" : "#000000"} emissiveIntensity={active ? 0.35 : 0} roughness={0.4} />
      </mesh>
      <Text position={[0, 0, 0.36]} fontSize={0.22} color={active ? "#0A120D" : "#E2E8F0"}>
        {value}
      </Text>
    </group>
  );
}

export default function HashingScene({ state }: { state: HashingStepState }) {
  const spacing = 1.05;
  const offset = ((state.buckets.length - 1) * spacing) / 2;

  return (
    <Canvas camera={{ position: [0, 0.3, 7], fov: 45 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 4, 4]} intensity={40} color="#E8B84B" />
      {state.buckets.map((bucket, b) => {
        const x = b * spacing - offset;
        return (
          <group key={b}>
            {/* bucket floor marker */}
            <mesh position={[x, -1.6, 0]}>
              <boxGeometry args={[0.85, 0.06, 0.6]} />
              <meshBasicMaterial color={state.activeBucket === b ? "#FF6B4A" : "#2E4033"} />
            </mesh>
            <Text position={[x, -2.0, 0]} fontSize={0.18} color="#64748B">
              {b}
            </Text>
            {bucket.map((value, k) => (
              <Item key={k} x={x} y={-1.2 + k * 0.6} value={value} active={state.activeBucket === b && k === bucket.length - 1} />
            ))}
          </group>
        );
      })}
    </Canvas>
  );
}
