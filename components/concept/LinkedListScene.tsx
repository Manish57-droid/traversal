"use client";

import { Canvas } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import type { LinkedListStepState } from "@/lib/concepts/data";

function Node({ x, value, active }: { x: number; value: number; active: boolean }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshStandardMaterial
          color={active ? "#C6F135" : "#1E2226"}
          emissive={active ? "#C6F135" : "#000000"}
          emissiveIntensity={active ? 0.4 : 0}
          roughness={0.35}
        />
      </mesh>
      <Text position={[0, 0, 0.5]} fontSize={0.28} color={active ? "#0A0B0E" : "#E2E8F0"}>
        {value}
      </Text>
    </group>
  );
}

function Arrow({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.55, 6]} />
        <meshBasicMaterial color="#2A2E35" />
      </mesh>
      <mesh position={[0.27, 0, 0]}>
        <coneGeometry args={[0.09, 0.2, 8]} />
        <meshBasicMaterial color="#2A2E35" />
      </mesh>
    </group>
  );
}

export default function LinkedListScene({ state }: { state: LinkedListStepState }) {
  const spacing = 1.5;
  const offset = ((state.values.length - 1) * spacing) / 2;

  return (
    <Canvas camera={{ position: [0, 1, 7], fov: 45 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 4, 4]} intensity={40} color="#4CC9F0" />
      {state.values.map((v, i) => (
        <group key={i}>
          <Node x={i * spacing - offset} value={v} active={state.activeIndex === i} />
          {i < state.values.length - 1 && <Arrow x={i * spacing - offset + spacing / 2} />}
        </group>
      ))}
      <Text position={[-offset, 0.85, 0]} fontSize={0.2} color="#64748B">
        head
      </Text>
    </Canvas>
  );
}
