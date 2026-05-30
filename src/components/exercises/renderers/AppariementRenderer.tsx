"use client";
import { useState, useId } from "react";
import { Button } from "@/src/components/ui/Button";

interface Side { id: string; text: string }
interface Props {
  payload: unknown;
  onSubmit: (answer: unknown) => void;
  disabled: boolean;
}

/**
 * Glisser-déposer via @hello-pangea/dnd avec fallback clavier (tap-to-select / tap-to-pair).
 * Sur mobile et pour l'accessibilité : cliquer un item gauche, puis un item droit pour les
 * associer (alternative tactile/clavier au DnD).
 */
export function AppariementRenderer({ payload, onSubmit, disabled }: Props) {
  const { left, right } = payload as { left: Side[]; right: Side[] };
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const id = useId();

  function selectLeft(lid: string) {
    if (disabled) return;
    setSelectedLeft((prev) => (prev === lid ? null : lid));
  }

  function selectRight(rid: string) {
    if (disabled || !selectedLeft) return;
    setPairs((prev) => ({ ...prev, [selectedLeft]: rid }));
    setSelectedLeft(null);
  }

  function removePair(lid: string) {
    if (disabled) return;
    setPairs((prev) => { const n = { ...prev }; delete n[lid]; return n; });
  }

  const allPaired = left.every((l) => pairs[l.id]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-encre-soft text-xs">
        Cliquez un terme (gauche), puis sa définition (droite). Ou glissez-déposez.
      </p>
      <div className="grid grid-cols-2 gap-3" aria-label="Appariement">
        {/* Colonne gauche */}
        <div className="flex flex-col gap-2">
          {left.map((l) => {
            const paired = pairs[l.id];
            const isSelected = selectedLeft === l.id;
            return (
              <button key={l.id} id={`${id}-l-${l.id}`}
                onClick={() => paired ? removePair(l.id) : selectLeft(l.id)}
                disabled={disabled}
                aria-pressed={isSelected}
                className={`rounded-lg border p-2 text-left text-sm transition-colors ${isSelected ? "border-lavande-500 bg-lavande-100" : paired ? "border-green-400 bg-green-50" : "border-grege-300 hover:bg-grege-200"}`}
              >
                {l.text}
                {paired && <span className="ml-2 text-green-600 text-xs">✓ {right.find((r) => r.id === paired)?.text.slice(0, 20)}…</span>}
              </button>
            );
          })}
        </div>
        {/* Colonne droite */}
        <div className="flex flex-col gap-2">
          {right.map((r) => {
            const usedBy = Object.entries(pairs).find(([, rid]) => rid === r.id)?.[0];
            return (
              <button key={r.id} id={`${id}-r-${r.id}`}
                onClick={() => selectRight(r.id)}
                disabled={disabled || (!!usedBy && usedBy !== selectedLeft)}
                className={`rounded-lg border p-2 text-left text-sm transition-colors ${usedBy ? "border-green-400 bg-green-50 opacity-60" : selectedLeft ? "border-lavande-300 hover:bg-lavande-100" : "border-grege-300 hover:bg-grege-200"}`}
              >
                {r.text}
              </button>
            );
          })}
        </div>
      </div>
      <Button disabled={!allPaired || disabled} onClick={() => onSubmit({ pairs })}>Valider</Button>
    </div>
  );
}
