"use client";
import { useState } from "react";
import { Button } from "@/src/components/ui/Button";

interface Props {
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}

export function SingleInputRenderer({ onSubmit, disabled }: Props) {
  const [text, setText] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <input value={text} onChange={(e) => setText(e.target.value)} disabled={disabled}
        placeholder="Votre réponse…"
        onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) onSubmit({ text }); }}
        className="border-grege-300 rounded-lg border px-3 py-2 text-sm outline-none focus:border-lavande-500"
        aria-label="Réponse" />
      <Button disabled={!text.trim() || disabled} onClick={() => onSubmit({ text })}>Valider</Button>
    </div>
  );
}
