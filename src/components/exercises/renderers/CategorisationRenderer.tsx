"use client";
import { useState } from "react";
import { Button } from "@/src/components/ui/Button";

interface Bin { id: string; label: string }
interface Props {
  payload: unknown;
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}

export function CategorisationRenderer({ payload, onSubmit, disabled }: Props) {
  const { items, bins } = payload as { items: string[]; bins: Bin[] };
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);

  function assignToBin(binId: string) {
    if (!selected || disabled) return;
    setAssign((prev) => ({ ...prev, [selected]: binId }));
    setSelected(null);
  }

  const allAssigned = items.every((it) => assign[it]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-encre-soft text-xs">Sélectionnez un terme, puis sa catégorie.</p>
      {/* Termes */}
      <div className="flex flex-wrap gap-2">
        {items.map((it) => {
          const assignedBin = assign[it];
          return (
            <button key={it} type="button"
              onClick={() => !disabled && setSelected(it)}
              aria-pressed={selected === it}
              disabled={disabled}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${selected === it ? "border-lavande-500 bg-lavande-100" : assignedBin ? "border-green-400 bg-green-50 opacity-60" : "border-grege-300 hover:bg-grege-200"}`}
            >
              {it}
              {assignedBin && <span className="ml-1 text-green-700 text-xs">({bins.find((b) => b.id === assignedBin)?.label})</span>}
            </button>
          );
        })}
      </div>
      {/* Bacs */}
      {selected && (
        <div className="flex flex-wrap gap-2">
          {bins.map((b) => (
            <button key={b.id} type="button"
              onClick={() => assignToBin(b.id)}
              className="border-lavande-300 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-lavande-100"
            >{b.label}</button>
          ))}
        </div>
      )}
      <Button disabled={!allAssigned || disabled} onClick={() => onSubmit({ assign })}>Valider</Button>
    </div>
  );
}
