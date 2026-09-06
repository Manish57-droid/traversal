"use client";

import { Canvas } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import type { ArrayStepState } from "@/lib/concepts/data";

function Cell({ x, index, value, active }: { x: number; index: number; value: number; active: boolean }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial
          color={active ? "#FF6A3D" : "#1E2226"}
          emissive={active ? "#FF6A3D" : "#000000"}
          emissiveIntensity={active ? 0.35 : 0}
          roughness={0.4}
        />
      </mesh>
      <Text position={[0, 0, 0.48]} fontSize={0.32} color={active ? "#0A0B0E" : "#E2E8F0"}>
        {value}
      </Text>
      <Text position={[0, -0.75, 0]} fontSize={0.2} color="#64748B">
        {index}
      </Text>
    </group>
  );
}

export default function ArrayScene({ state }: { state: ArrayStepState }) {
  const spacing = 1.15;
  const offset = ((state.values.length - 1) * spacing) / 2;

  return (
    <Canvas camera={{ position: [0, 1.5, 6], fov: 45 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 4, 4]} intensity={40} color="#C6F135" />
      {state.values.map((v, i) => (
        <Cell key={i} x={i * spacing - offset} index={i} value={v} active={state.activeIndices.includes(i)} />
      ))}
    </Canvas>
  );
}
