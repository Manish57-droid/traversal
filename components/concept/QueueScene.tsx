"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { QueueStepState } from "@/lib/concepts/data";

function Cell({ x, value, highlight }: { x: number; value: number; highlight: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!highlight) return;
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
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial ref={materialRef} color={highlight ? "#E8B84B" : "#17251C"} emissive={highlight ? "#E8B84B" : "#000000"} emissiveIntensity={highlight ? 0.35 : 0} roughness={0.4} />
      </mesh>
      <Text position={[0, 0, 0.48]} fontSize={0.3} color={highlight ? "#0A120D" : "#E2E8F0"}>
        {value}
      </Text>
    </group>
  );
}

export default function QueueScene({ state }: { state: QueueStepState }) {
  const spacing = 1.15;
  const offset = ((state.queue.length - 1) * spacing) / 2;

  return (
    <Canvas camera={{ position: [0, 1.3, 6.5], fov: 45 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 4, 4]} intensity={40} color="#D9824C" />
      {state.queue.length === 0 && (
        <Text position={[0, 0, 0]} fontSize={0.24} color="#475569">
          empty queue
        </Text>
      )}
      {state.queue.map((v, i) => {
        const isFront = i === 0;
        const isRear = i === state.queue.length - 1;
        const highlight = (state.action === "dequeue" && isFront) || (state.action === "enqueue" && isRear);
        return <Cell key={i} x={i * spacing - offset} value={v} highlight={highlight} />;
      })}
      {state.queue.length > 0 && (
        <>
          <Text position={[-offset, 0.85, 0]} fontSize={0.2} color="#64748B">
            front
          </Text>
          <Text position={[(state.queue.length - 1) * spacing - offset, 0.85, 0]} fontSize={0.2} color="#64748B">
            rear
          </Text>
        </>
      )}
    </Canvas>
  );
}
