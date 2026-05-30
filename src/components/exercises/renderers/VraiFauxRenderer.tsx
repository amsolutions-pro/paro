"use client";
import { useState } from "react";
import { Button } from "@/src/components/ui/Button";

interface Props {
  payload: unknown;
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function VraiFauxRenderer({ payload: _payload, onSubmit, disabled }: Props) {
  const [value, setValue] = useState<boolean | null>(null);
  const [justification, setJustification] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        {([true, false] as const).map((v) => (
          <button key={String(v)} type="button"
            onClick={() => !disabled && setValue(v)}
            aria-pressed={value === v}
            className={`flex-1 rounded-lg border py-3 font-semibold text-sm transition-colors ${value === v ? (v ? "border-green-500 bg-green-100 text-green-800" : "border-red-400 bg-red-100 text-red-800") : "border-grege-300 hover:bg-grege-200"}`}
          >
            {v ? "Vrai" : "Faux"}
          </button>
        ))}
      </div>
      <textarea value={justification} onChange={(e) => setJustification(e.target.value)}
        disabled={disabled} placeholder="Justification (optionnelle)…"
        rows={2}
        className="border-grege-300 rounded-lg border p-2 text-sm outline-none focus:border-lavande-500 resize-none"
        aria-label="Justification" />
      <Button disabled={value === null || disabled} onClick={() => onSubmit({ value, justification })}>Valider</Button>
    </div>
  );
}
