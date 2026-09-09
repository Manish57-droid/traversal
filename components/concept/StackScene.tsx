"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { StackStepState } from "@/lib/concepts/data";

function Block({ y, value, isTop, action }: { y: number; value: number; isTop: boolean; action: string }) {
  const highlight = isTop && (action === "push" || action === "pop" || action === "peek");
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!highlight) return;
    const pulse = Math.sin(clock.elapsedTime * 4) * 0.5 + 0.5;
    if (materialRef.current) materialRef.current.emissiveIntensity = 0.25 + pulse * 0.35;
    if (meshRef.current) {
      const scale = 1 + pulse * 0.06;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={[0, y, 0]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[1.6, 0.7, 1]} />
        <meshStandardMaterial
          ref={materialRef}
          color={highlight ? "#E8B84B" : "#17251C"}
          emissive={highlight ? "#E8B84B" : "#000000"}
          emissiveIntensity={highlight ? 0.3 : 0}
          roughness={0.4}
        />
      </mesh>
      <Text position={[0, 0, 0.55]} fontSize={0.28} color={highlight ? "#0A120D" : "#E2E8F0"}>
        {value}
      </Text>
    </group>
  );
}

export default function StackScene({ state }: { state: StackStepState }) {
  const spacing = 0.85;

  return (
    <Canvas camera={{ position: [0, 1, 6], fov: 45 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 4, 4]} intensity={40} color="#D9824C" />
      {state.stack.length === 0 && (
        <Text position={[0, 0, 0]} fontSize={0.24} color="#475569">
          empty stack
        </Text>
      )}
      {state.stack.map((v, i) => (
        <Block
          key={i}
          y={i * spacing - (state.stack.length * spacing) / 2 + spacing / 2}
          value={v}
          isTop={i === state.stack.length - 1}
          action={state.action}
        />
      ))}
      <Text position={[-1.6, -(state.stack.length * spacing) / 2, 0]} fontSize={0.2} color="#64748B">
        base
      </Text>
    </Canvas>
  );
}
