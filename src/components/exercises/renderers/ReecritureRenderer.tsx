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
  const { phrase_depart, mot_souligne, indice } = payload as {
    phrase_depart: string;
    mot_souligne: string;
    indice?: string;
  };

  const [text, setText] = useState("");
  const [showIndice, setShowIndice] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selfEval, setSelfEval] = useState<SelfEval | null>(null);

  // Surligne le mot à remplacer dans la phrase de départ
  function renderPhrase() {
    const re = new RegExp(`(${mot_souligne.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i");
    const parts = phrase_depart.split(re);
    return parts.map((part, i) =>
      re.test(part) ? (
        <mark key={i} className="bg-lavande-100 text-lavande-800 font-semibold rounded px-0.5 not-italic underline decoration-lavande-400 decoration-2">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  }

  function handleSubmit() {
    if (!text.trim() || submitted) return;
    setSubmitted(true);
    onSubmit({ text });
  }

  const selfEvalOptions: { value: SelfEval; label: string; color: string }[] = [
    { value: "reussi",   label: "Réussi ✓",  color: "border-green-400 bg-green-50 text-green-800" },
    { value: "partiel",  label: "Partiel ~",  color: "border-amber-400 bg-amber-50 text-amber-800" },
    { value: "a-revoir", label: "À revoir ✗", color: "border-red-400 bg-red-50 text-red-800" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Phrase de départ avec mot souligné */}
      <div className="rounded-lg border border-grege-300 bg-grege-50 p-3 flex flex-col gap-1.5">
        <p className="text-xs font-medium text-encre-soft uppercase tracking-wide">Phrase de départ</p>
        <p className="text-sm font-serif leading-relaxed text-encre">
          {renderPhrase()}
        </p>
      </div>

      {/* Consigne unique — ne mentionne jamais le mot cible */}
      <p className="text-sm text-encre">
        Réécrivez cette phrase en remplaçant le mot souligné par son paronyme,
        en adaptant le contexte si nécessaire.
      </p>

      {/* Bouton indice dépliable */}
      {indice && !submitted && (
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

      {/* Zone de saisie — État A */}
      {!submitted && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Votre phrase réécrite…"
            className="border-grege-300 rounded-lg border p-3 text-sm outline-none focus:border-lavande-500 resize-none"
            aria-label="Phrase réécrite"
          />
          <Button disabled={!text.trim()} onClick={handleSubmit}>
            Soumettre
          </Button>
        </>
      )}

      {/* État B — réponse soumise : affiche la saisie + auto-évaluation */}
      {submitted && (
        <div className="flex flex-col gap-3">
          {/* Rappel de la réponse de l'étudiant */}
          <div className="rounded-lg bg-grege-100 border border-grege-200 px-3 py-2">
            <p className="text-xs font-medium text-encre-soft mb-1">Votre réponse</p>
            <p className="text-sm font-serif italic text-encre">« {text} »</p>
          </div>

          {/* Auto-évaluation — visible seulement après soumission + résultat API */}
          {disabled && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-encre-soft">
                Comment évaluez-vous votre réponse ?
              </p>
              <div className="flex gap-2 flex-wrap">
                {selfEvalOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setSelfEval(o.value)}
                    aria-pressed={selfEval === o.value}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selfEval === o.value ? o.color : "border-grege-300 hover:bg-grege-200"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
