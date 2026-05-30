"use client";
import { useState } from "react";
import { Button } from "@/src/components/ui/Button";

interface Props {
  payload: unknown;
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}

export function AnomalieRenderer({ payload, onSubmit, disabled }: Props) {
  const { sentence } = payload as { sentence: string };
  const words = sentence.split(/(\s+)/);
  const [wrong, setWrong] = useState("");
  const [correct, setCorrect] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-encre-soft text-xs">Cliquez sur le mot fautif dans la phrase, puis proposez la correction.</p>
      <div className="flex flex-wrap gap-1">
        {words.map((w, i) =>
          /\s+/.test(w) ? <span key={i}> </span> : (
            <button key={i} type="button"
              onClick={() => !disabled && setWrong(w.replace(/[.,;:?!»«"']/g, ""))}
              className={`rounded px-1 py-0.5 text-sm transition-colors ${wrong === w.replace(/[.,;:?!»«"']/g, "") ? "bg-red-200 font-semibold" : "hover:bg-grege-200"}`}
            >{w}</button>
          )
        )}
      </div>
      {wrong && (
        <div className="flex items-center gap-2">
          <span className="text-red-600 text-sm line-through">{wrong}</span>
          <span>→</span>
          <input value={correct} onChange={(e) => setCorrect(e.target.value)} disabled={disabled}
            placeholder="correction…" className="border-grege-300 rounded border px-2 py-1 text-sm focus:border-lavande-500 outline-none" aria-label="Correction" />
        </div>
      )}
      <Button disabled={!wrong || !correct.trim() || disabled} onClick={() => onSubmit({ wrong, correct })}>Valider</Button>
    </div>
  );
}
