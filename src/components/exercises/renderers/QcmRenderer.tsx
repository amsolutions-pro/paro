"use client";
import { useState, useRef } from "react";

interface Props {
  payload: unknown;
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}
interface Option { key: string; text: string }

export function QcmRenderer({ payload, onSubmit, disabled }: Props) {
  const { options } = payload as { options: Option[] };
  const [selected, setSelected] = useState<string | null>(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function pick(key: string) {
    if (disabled) return;
    setSelected(key);
    onSubmit({ key });
  }

  // Navigation clavier conforme au pattern radiogroup (flèches + roving tabindex).
  function onKeyDown(e: React.KeyboardEvent, idx: number) {
    if (disabled) return;
    let next = idx;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (idx + 1) % options.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (idx - 1 + options.length) % options.length;
    else return;
    e.preventDefault();
    setFocusIdx(next);
    btnRefs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label="Choisissez une réponse" className="flex flex-col gap-2">
      {options.map((opt, idx) => (
        <button
          key={opt.key}
          ref={(el) => { btnRefs.current[idx] = el; }}
          type="button"
          role="radio"
          aria-checked={selected === opt.key}
          tabIndex={idx === focusIdx ? 0 : -1}
          onKeyDown={(e) => onKeyDown(e, idx)}
          onClick={() => pick(opt.key)}
          disabled={disabled}
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
  );
}
