"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { StringStepState } from "@/lib/concepts/data";

function Cell({ x, index, value, active, status }: { x: number; index: number; value: string; active: boolean; status: StringStepState["status"] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const color = active ? (status === "match" ? "#E8B84B" : status === "mismatch" ? "#FF6B4A" : "#D9824C") : "#17251C";

  useFrame(({ clock }) => {
    if (!active) return;
    const pulse = Math.sin(clock.elapsedTime * 4) * 0.5 + 0.5;
    if (materialRef.current) materialRef.current.emissiveIntensity = 0.3 + pulse * 0.35;
    if (meshRef.current) {
      const scale = 1 + pulse * 0.08;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={[x, 0, 0]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.8, 0.9, 0.8]} />
        <meshStandardMaterial ref={materialRef} color={color} emissive={active ? color : "#000000"} emissiveIntensity={active ? 0.35 : 0} roughness={0.4} />
      </mesh>
      <Text position={[0, 0, 0.44]} fontSize={0.3} color={active ? "#0A120D" : "#E2E8F0"}>
        {value === " " ? "␣" : value}
      </Text>
      <Text position={[0, -0.75, 0]} fontSize={0.18} color="#64748B">
        {index}
      </Text>
    </group>
  );
}

export default function StringScene({ state }: { state: StringStepState }) {
  const spacing = 1.0;
  const offset = ((state.chars.length - 1) * spacing) / 2;

  return (
    <Canvas camera={{ position: [0, 1.2, Math.max(6, state.chars.length * 0.6)], fov: 45 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 4, 4]} intensity={40} color="#D9824C" />
      {state.chars.map((c, i) => (
        <Cell key={i} x={i * spacing - offset} index={i} value={c} active={state.activeIndices.includes(i)} status={state.status} />
      ))}
    </Canvas>
  );
}
