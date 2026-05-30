"use client";
import { useState } from "react";
import { Button } from "@/src/components/ui/Button";

interface Props {
  payload: unknown;
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}

export function TrousRenderer({ payload, onSubmit, disabled }: Props) {
  const { bank, blanksCount } = payload as { bank?: string[]; blanksCount: number };
  const [answers, setAnswers] = useState<string[]>(Array(blanksCount).fill(""));

  function update(i: number, val: string) {
    setAnswers((prev) => prev.map((v, idx) => (idx === i ? val : v)));
  }

  return (
    <div className="flex flex-col gap-3">
      {bank && (
        <div className="flex flex-wrap gap-2">
          <span className="text-encre-soft text-xs font-medium">Banque :</span>
          {bank.map((w) => (
            <button key={w} type="button" onClick={() => { const empty = answers.findIndex((a) => !a); if (empty >= 0) update(empty, w); }}
              className="border-lavande-300 rounded border px-2 py-0.5 text-sm hover:bg-lavande-100">{w}</button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2">
        {answers.map((val, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-encre-soft text-sm w-4">{i + 1}.</span>
            <input value={val} onChange={(e) => update(i, e.target.value)} disabled={disabled}
              className="border-grege-300 rounded border px-3 py-1.5 text-sm outline-none focus:border-lavande-500"
              placeholder="Votre réponse…" aria-label={`Blanc ${i + 1}`} />
          </div>
        ))}
      </div>
      <Button disabled={answers.some((a) => !a.trim()) || disabled} onClick={() => onSubmit({ answers })}>Valider</Button>
    </div>
  );
}
