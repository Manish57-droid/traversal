import type { ConceptTheory } from "@/lib/concepts/data";

export default function TheoryPanel({ theory }: { theory: ConceptTheory }) {
  return (
    <div className="card space-y-5 p-5">
      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Definition</p>
        <p className="text-sm text-slate-300">{theory.definition}</p>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Time complexity</p>
        <div className="space-y-1.5">
          {theory.operations.map((op) => (
            <div key={op.name} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-300">{op.name}</span>
              <span className="rounded bg-bg px-2 py-0.5 font-mono text-xs text-success">{op.complexity}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Where it's used</p>
        <ul className="space-y-1 text-sm text-slate-300">
          {theory.useCases.map((useCase) => (
            <li key={useCase} className="flex gap-2">
              <span className="text-accent">•</span>
              {useCase}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
