"use client";

import { useEffect, useRef, useState } from "react";

// Chrome around any concept visualization: play/pause, step forward/back,
// a scrubbable dot-per-step progress row, a caption panel, and — the
// "game" part — the scene itself is tappable to advance, like a story,
// so reading a topic feels like clicking through rather than watching
// a video. The 3D scene itself is passed in as a render prop so each
// topic (array, stack, linked list, tree) can bring its own visual.
export default function ConceptPlayer({
  steps,
  renderScene,
}: {
  steps: { title: string; description: string }[];
  renderScene: (stepIndex: number) => React.ReactNode;
}) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [tapped, setTapped] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrent((prev) => {
          if (prev >= steps.length - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2200);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, steps.length]);

  function goTo(index: number) {
    setPlaying(false);
    setCurrent(Math.max(0, Math.min(steps.length - 1, index)));
  }

  function handleSceneTap() {
    setTapped(true);
    setPlaying(false);
    setCurrent((prev) => (prev >= steps.length - 1 ? 0 : prev + 1));
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleSceneTap}
        aria-label="Tap to advance to the next step"
        className="card relative block h-[320px] w-full cursor-pointer overflow-hidden text-left sm:h-[420px]"
      >
        {renderScene(current)}
        {!tapped && (
          <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 animate-pulse rounded-full border border-accent/40 bg-bg/80 px-3 py-1 text-xs text-accent-2">
            Tap to advance →
          </span>
        )}
      </button>

      <div className="card p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goTo(current - 1)}
            disabled={current === 0}
            className="btn-secondary px-3 py-2 text-sm disabled:opacity-30"
            aria-label="Previous step"
          >
            ‹
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="btn-primary px-4 py-2 text-sm"
          >
            {playing ? "Pause" : current >= steps.length - 1 ? "Replay" : "Play"}
          </button>
          <button
            onClick={() => goTo(current + 1)}
            disabled={current === steps.length - 1}
            className="btn-secondary px-3 py-2 text-sm disabled:opacity-30"
            aria-label="Next step"
          >
            ›
          </button>

          <div className="ml-2 flex flex-1 items-center gap-1.5 overflow-x-auto">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-1.5 flex-1 min-w-[8px] rounded-full transition-colors ${
                  i === current ? "bg-success" : i < current ? "bg-success/40" : "bg-surface-2"
                }`}
              />
            ))}
          </div>

          <span className="shrink-0 text-xs text-fg-subtle">
            {current + 1} / {steps.length}
          </span>
        </div>

        <div className="mt-4">
          <p className="font-display text-lg text-fg">{steps[current].title}</p>
          <p className="mt-1 text-sm text-fg-muted">{steps[current].description}</p>
        </div>
      </div>
    </div>
  );
}
