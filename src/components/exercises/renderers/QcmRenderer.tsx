"use client";
import { useState } from "react";
import { Button } from "@/src/components/ui/Button";

interface Props {
  payload: unknown;
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}
interface Option { key: string; text: string }

export function QcmRenderer({ payload, onSubmit, disabled }: Props) {
  const { options } = payload as { options: Option[] };
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <fieldset>
        <legend className="sr-only">Choisissez une réponse</legend>
        <div className="flex flex-col gap-2">
          {options.map((opt) => (
            <label key={opt.key} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${selected === opt.key ? "border-lavande-500 bg-lavande-100" : "border-grege-300 hover:bg-grege-200"}`}>
              <input type="radio" name="qcm" value={opt.key} checked={selected === opt.key} onChange={() => setSelected(opt.key)} disabled={disabled} className="accent-lavande-500" />
              <span className="font-medium">{opt.key})</span>
              <span>{opt.text}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Button disabled={!selected || disabled} onClick={() => onSubmit({ key: selected })}>Valider</Button>
    </div>
  );
}
