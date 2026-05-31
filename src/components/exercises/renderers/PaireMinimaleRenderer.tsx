"use client";
import { useState } from "react";

interface Props {
  payload: unknown;
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}

export function PaireMinimaleRenderer({ payload, onSubmit, disabled }: Props) {
  const { pair } = payload as { pair: string[] };
  const [selected, setSelected] = useState<string | null>(null);

  function pick(w: string) {
    if (disabled) return;
    setSelected(w);
    onSubmit({ text: w });
  }

  return (
    <div className="flex gap-3">
      {pair.map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => pick(w)}
          disabled={disabled}
          aria-pressed={selected === w}
          className={`flex-1 rounded-lg border py-3 text-sm font-medium transition-colors ${
            selected === w
              ? "border-lavande-500 bg-lavande-100 text-lavande-700"
              : "border-grege-300 hover:bg-grege-200"
          } disabled:opacity-60`}
        >
          {w}
        </button>
      ))}
    </div>
  );
}
