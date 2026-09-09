"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/concepts/data";

// A short, scored recap quiz — the "did this actually sink in" check
// after playing through the 3D steps. Purely client-side, no accounts
// or backend needed since it's not something we track over time.
export default function TopicQuiz({ questions }: { questions: QuizQuestion[] }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  function handleAnswer(optionIndex: number) {
    if (selected !== null) return; // already answered this one
    setSelected(optionIndex);
    if (optionIndex === questions[current].correctIndex) {
      setScore((s) => s + 1);
    }
  }

  function handleNext() {
    if (current === questions.length - 1) {
      setFinished(true);
      return;
    }
    setCurrent((c) => c + 1);
    setSelected(null);
  }

  function handleRestart() {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  }

  if (finished) {
    const allCorrect = score === questions.length;
    return (
      <div className="card p-6 text-center">
        <p className="font-display text-2xl text-fg">
          {score} / {questions.length}
        </p>
        <p className="mt-2 text-sm text-fg-muted">
          {allCorrect
            ? "Perfect score — this one's locked in."
            : score === 0
            ? "Worth another pass through the steps above before retrying."
            : "Good start — replay the steps above and try again for a perfect score."}
        </p>
        <button onClick={handleRestart} className="btn-primary mt-4">
          Try again
        </button>
      </div>
    );
  }

  const question = questions[current];

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between text-xs text-fg-subtle">
        <span>
          Question {current + 1} of {questions.length}
        </span>
        <span>Score: {score}</span>
      </div>

      <p className="font-display text-lg text-fg">{question.question}</p>

      <div className="mt-4 space-y-2">
        {question.options.map((option, i) => {
          const isCorrect = i === question.correctIndex;
          const isPicked = i === selected;
          const showResult = selected !== null;

          let style = "border-line/70 hover:border-line";
          if (showResult && isCorrect) style = "border-success/60 bg-success/10 text-success";
          else if (showResult && isPicked && !isCorrect) style = "border-red-500/50 bg-red-500/10 text-red-400";

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={showResult}
              className={`block w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors disabled:cursor-default ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <button onClick={handleNext} className="btn-primary mt-4">
          {current === questions.length - 1 ? "See score" : "Next question"}
        </button>
      )}
    </div>
  );
}
