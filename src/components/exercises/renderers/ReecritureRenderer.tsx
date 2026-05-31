"use client";
import { useState } from "react";
import { Button } from "@/src/components/ui/Button";

interface Props {
  payload: unknown;
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}

type SelfEval = "reussi" | "partiel" | "a-revoir";

export function ReecritureRenderer({ payload, onSubmit, disabled }: Props) {
  const { source, target } = payload as { source: string; target: string };
  const [text, setText] = useState("");
  const [selfEval, setSelfEval] = useState<SelfEval | null>(null);

  const options: { value: SelfEval; label: string; color: string }[] = [
    { value: "reussi",   label: "Réussi ✓",  color: "border-green-400 bg-green-50 text-green-800" },
    { value: "partiel",  label: "Partiel ~",  color: "border-amber-400 bg-amber-50 text-amber-800" },
    { value: "a-revoir", label: "À revoir ✗", color: "border-red-400 bg-red-50 text-red-800" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Phrase source à réécrire */}
      <div className="rounded-lg border border-grege-300 bg-grege-50 p-3 flex flex-col gap-1">
        <p className="text-xs font-medium text-encre-soft uppercase tracking-wide">Phrase de départ</p>
        <p className="text-sm font-serif italic text-encre leading-relaxed">« {source} »</p>
      </div>

      {/* Consigne claire */}
      <p className="text-sm text-encre">
        Réécrivez cette phrase en remplaçant le mot souligné par{" "}
        <strong className="text-lavande-600">« {target} »</strong>
        {" "}et en adaptant le reste de la phrase si nécessaire.
      </p>

      {/* Zone de réécriture */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        rows={3}
        placeholder={`Votre phrase avec « ${target} »…`}
        className="border-grege-300 rounded-lg border p-3 text-sm outline-none focus:border-lavande-500 resize-none"
        aria-label="Phrase réécrite"
      />

      <div className="flex flex-col gap-1.5">
        <p className="text-encre-soft text-xs">Auto-évaluation :</p>
        <div className="flex gap-2 flex-wrap">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => !disabled && setSelfEval(o.value)}
              aria-pressed={selfEval === o.value}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${selfEval === o.value ? o.color : "border-grege-300 hover:bg-grege-200"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        disabled={!text.trim() || !selfEval || disabled}
        onClick={() => onSubmit({ text, selfEval })}
      >
        Soumettre
      </Button>
    </div>
  );
}
