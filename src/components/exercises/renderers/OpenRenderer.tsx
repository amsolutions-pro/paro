"use client";
import { useState } from "react";
import { Button } from "@/src/components/ui/Button";

interface Props {
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}

export function OpenRenderer({ onSubmit, disabled }: Props) {
  const [text, setText] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        rows={4}
        placeholder="Rédigez votre réponse…"
        className="border-grege-300 rounded-lg border p-3 text-sm outline-none focus:border-lavande-500 resize-none"
        aria-label="Réponse libre"
      />
      <Button disabled={!text.trim() || disabled} onClick={() => onSubmit({ text })}>
        Soumettre
      </Button>
    </div>
  );
}
