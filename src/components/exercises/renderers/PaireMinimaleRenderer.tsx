"use client";
import { useState } from "react";
import { Button } from "@/src/components/ui/Button";

interface Props {
  payload: unknown;
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}

export function PaireMinimaleRenderer({ payload, onSubmit, disabled }: Props) {
  const { pair } = payload as { pair: string[] };
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        {pair.map((w) => (
          <button key={w} type="button"
            onClick={() => !disabled && setSelected(w)}
            aria-pressed={selected === w}
            className={`flex-1 rounded-lg border py-3 text-sm font-medium transition-colors ${selected === w ? "border-lavande-500 bg-lavande-100 text-lavande-700" : "border-grege-300 hover:bg-grege-200"}`}
          >
            {w}
          </button>
        ))}
      </div>
      <Button disabled={!selected || disabled} onClick={() => onSubmit({ text: selected })}>Valider</Button>
    </div>
  );
}
