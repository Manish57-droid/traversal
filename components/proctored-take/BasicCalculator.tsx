"use client";

import { useState } from "react";
import { Calculator as CalculatorIcon, X } from "lucide-react";

// A deliberately basic on-screen calculator (+ − × ÷, decimal, clear)
// for sections with calculator_enabled — no eval()/Function() (avoids
// executing arbitrary input as JS), just a small running-total state
// machine like a physical four-function calculator.
type Op = "+" | "-" | "×" | "÷";

function applyOp(a: number, b: number, op: Op): number {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "×": return a * b;
    case "÷": return b === 0 ? NaN : a / b;
  }
}

export default function BasicCalculator() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<Op | null>(null);
  const [freshEntry, setFreshEntry] = useState(true);

  function inputDigit(d: string) {
    setDisplay((prev) => (freshEntry || prev === "0" ? d : prev + d));
    setFreshEntry(false);
  }

  function inputDecimal() {
    setDisplay((prev) => {
      if (freshEntry) return "0.";
      return prev.includes(".") ? prev : prev + ".";
    });
    setFreshEntry(false);
  }

  function clearAll() {
    setDisplay("0");
    setStored(null);
    setPendingOp(null);
    setFreshEntry(true);
  }

  function chooseOp(op: Op) {
    const value = parseFloat(display);
    if (stored !== null && pendingOp && !freshEntry) {
      setStored(applyOp(stored, value, pendingOp));
    } else {
      setStored(value);
    }
    setPendingOp(op);
    setFreshEntry(true);
  }

  function equals() {
    if (stored === null || !pendingOp) return;
    const value = parseFloat(display);
    const result = applyOp(stored, value, pendingOp);
    setDisplay(Number.isFinite(result) ? String(Math.round(result * 1e10) / 1e10) : "Error");
    setStored(null);
    setPendingOp(null);
    setFreshEntry(true);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary flex items-center gap-1.5 py-1.5 text-xs"
      >
        <CalculatorIcon className="h-3.5 w-3.5" />
        Calculator
      </button>
    );
  }

  return (
    // Fixed to a screen corner rather than inline — this used to sit
    // directly in the question header's flex row and shove the whole
    // card open when clicked; floating it keeps the question layout
    // stable regardless of whether the calculator is open.
    <div className="card fixed bottom-4 right-4 z-[60] w-56 space-y-2 p-3 shadow-xl">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-fg">Calculator</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close calculator" className="text-fg-muted hover:text-fg">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="rounded-lg border border-line/70 bg-bg px-3 py-2 text-right font-mono text-lg text-fg">
        {display}
      </div>
      <div className="grid grid-cols-4 gap-1.5 text-sm">
        <button type="button" onClick={clearAll} className="btn-secondary col-span-2 py-1.5 text-xs">
          Clear
        </button>
        <button type="button" onClick={() => chooseOp("÷")} className="btn-secondary py-1.5 text-xs">÷</button>
        <button type="button" onClick={() => chooseOp("×")} className="btn-secondary py-1.5 text-xs">×</button>

        {["7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => inputDigit(d)} className="btn-secondary py-1.5 text-xs">{d}</button>
        ))}
        <button type="button" onClick={() => chooseOp("-")} className="btn-secondary py-1.5 text-xs">−</button>

        {["4", "5", "6"].map((d) => (
          <button key={d} type="button" onClick={() => inputDigit(d)} className="btn-secondary py-1.5 text-xs">{d}</button>
        ))}
        <button type="button" onClick={() => chooseOp("+")} className="btn-secondary py-1.5 text-xs">+</button>

        {["1", "2", "3"].map((d) => (
          <button key={d} type="button" onClick={() => inputDigit(d)} className="btn-secondary py-1.5 text-xs">{d}</button>
        ))}
        <button type="button" onClick={equals} className="btn-primary row-span-2 py-1.5 text-xs">=</button>

        <button type="button" onClick={() => inputDigit("0")} className="btn-secondary col-span-2 py-1.5 text-xs">0</button>
        <button type="button" onClick={inputDecimal} className="btn-secondary py-1.5 text-xs">.</button>
      </div>
    </div>
  );
}
