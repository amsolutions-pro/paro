"use client";
import { useState } from "react";

interface Props {
  payload: unknown;
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}
interface Option { key: string; text: string }

export function QcmRenderer({ payload, onSubmit, disabled }: Props) {
  const { options } = payload as { options: Option[] };
  const [selected, setSelected] = useState<string | null>(null);

  function pick(key: string) {
    if (disabled) return;
    setSelected(key);
    onSubmit({ key });
  }

  return (
    <fieldset>
      <legend className="sr-only">Choisissez une réponse</legend>
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => pick(opt.key)}
            disabled={disabled}
            aria-pressed={selected === opt.key}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors w-full ${
              selected === opt.key
                ? "border-lavande-500 bg-lavande-100"
                : "border-grege-300 hover:bg-grege-200"
            } disabled:opacity-60`}
          >
            <span className="font-medium text-sm">{opt.key})</span>
            <span className="text-sm">{opt.text}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
