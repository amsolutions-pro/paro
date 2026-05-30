"use client";
import { useState } from "react";
import { Button } from "@/src/components/ui/Button";

interface Blank { n: number; options: string[] }
interface Props {
  payload: unknown;
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}

export function TexteLacunaireRenderer({ payload, onSubmit, disabled }: Props) {
  const { text, blanks } = payload as { text: string; blanks: Blank[] };
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // Substitue les marqueurs (1), (2)… par des sélecteurs inline.
  const parts = text.split(/(\(\d+\))/g);

  const allFilled = blanks.every((b) => answers[b.n]);

  return (
    <div className="flex flex-col gap-4">
      <div className="leading-relaxed text-sm">
        {parts.map((part, i) => {
          const m = part.match(/^\((\d+)\)$/);
          if (m) {
            const n = Number(m[1]);
            const blank = blanks.find((b) => b.n === n);
            if (blank) {
              return (
                <select key={i} value={answers[n] ?? ""} disabled={disabled}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [n]: e.target.value }))}
                  className="mx-1 border-b-2 border-lavande-500 bg-transparent px-1 py-0.5 text-sm outline-none"
                  aria-label={`Blanc ${n}`}
                >
                  <option value="" disabled>…</option>
                  {blank.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              );
            }
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
      <Button disabled={!allFilled || disabled} onClick={() => onSubmit({ answers: blanks.map((b) => answers[b.n] ?? "") })}>Valider</Button>
    </div>
  );
}
