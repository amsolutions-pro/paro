"use client";
import { useState } from "react";
import { Button } from "@/src/components/ui/Button";

interface Props {
  payload: unknown;
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}

export function ReecritureRenderer({ payload, onSubmit, disabled }: Props) {
  const { phrase_depart, mot_souligne, indice } = payload as {
    phrase_depart: string;
    mot_souligne: string;
    indice?: string;
  };

  const [text, setText] = useState("");
  const [showIndice, setShowIndice] = useState(false);

  function renderPhrase() {
    const re = new RegExp(`(${mot_souligne.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i");
    const parts = phrase_depart.split(re);
    return parts.map((part, i) =>
      re.test(part) ? (
        <mark key={i} className="bg-lavande-100 text-lavande-800 font-semibold rounded px-0.5 underline decoration-lavande-400 decoration-2">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Phrase de départ */}
      <div className="rounded-lg border border-grege-300 bg-grege-50 p-3 flex flex-col gap-1.5">
        <p className="text-xs font-medium text-encre-soft uppercase tracking-wide">Phrase de départ</p>
        <p className="text-sm font-serif leading-relaxed text-encre">{renderPhrase()}</p>
      </div>

      <p className="text-sm text-encre">
        Réécrivez cette phrase en remplaçant le mot souligné par son paronyme,
        en adaptant le contexte si nécessaire.
      </p>

      {/* Indice dépliable */}
      {indice && !disabled && (
        <div>
          <button
            type="button"
            onClick={() => setShowIndice((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-lavande-600 hover:text-lavande-700 font-medium"
          >
            <span className={`inline-block transition-transform duration-150 ${showIndice ? "rotate-90" : ""}`} aria-hidden>▶</span>
            {showIndice ? "Masquer l'indice" : "Afficher l'indice"}
          </button>
          {showIndice && (
            <p className="mt-1.5 text-xs text-encre-soft italic border-l-2 border-lavande-300 pl-2">
              {indice}
            </p>
          )}
        </div>
      )}

      {/* Zone de saisie */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        rows={3}
        placeholder="Votre phrase réécrite…"
        className="border-grege-300 rounded-lg border p-3 text-sm outline-none focus:border-lavande-500 resize-none"
        aria-label="Phrase réécrite"
      />
      <Button disabled={!text.trim() || disabled} onClick={() => onSubmit({ text })}>
        Soumettre
      </Button>
    </div>
  );
}
