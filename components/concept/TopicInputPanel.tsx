"use client";

import { useState } from "react";
import { RotateCcw, Play } from "lucide-react";
import type { InputFieldSpec, TopicInput } from "@/lib/concepts/data";

// Lets a student replace a topic's canned example with their own
// input and re-run the exact same walkthrough on it — "Run" calls
// back into the topic's own `generateSteps`, so this component knows
// nothing about any specific algorithm, just how to collect strings.
export default function TopicInputPanel({
  fields,
  defaultInput,
  onRun,
}: {
  fields: InputFieldSpec[];
  defaultInput: TopicInput;
  onRun: (input: TopicInput) => void;
}) {
  const [values, setValues] = useState<TopicInput>(defaultInput);

  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleRun(e: React.FormEvent) {
    e.preventDefault();
    onRun(values);
  }

  function handleReset() {
    setValues(defaultInput);
    onRun(defaultInput);
  }

  return (
    <form onSubmit={handleRun} className="card space-y-3 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Try your own input</p>
      <div className={`grid gap-3 ${fields.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs text-fg-muted">{field.label}</label>
            <input
              className="input"
              placeholder={field.placeholder}
              value={values[field.key] ?? ""}
              onChange={(e) => update(field.key, e.target.value)}
            />
            <p className="mt-1 text-xs text-fg-subtle">{field.help}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex items-center gap-1.5 py-2 text-sm">
          <Play className="h-3.5 w-3.5" />
          Run
        </button>
        <button type="button" onClick={handleReset} className="btn-secondary flex items-center gap-1.5 py-2 text-sm">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to example
        </button>
      </div>
    </form>
  );
}
