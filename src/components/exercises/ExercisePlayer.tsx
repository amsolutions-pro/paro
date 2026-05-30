"use client";

import { useState } from "react";
import { getUserId } from "@/src/lib/user-store";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";

// Renderers
import { QcmRenderer } from "./renderers/QcmRenderer";
import { TrousRenderer } from "./renderers/TrousRenderer";
import { AnomalieRenderer } from "./renderers/AnomalieRenderer";
import { AppariementRenderer } from "./renderers/AppariementRenderer";
import { VraiFauxRenderer } from "./renderers/VraiFauxRenderer";
import { SingleInputRenderer } from "./renderers/SingleInputRenderer";
import { PaireMinimaleRenderer } from "./renderers/PaireMinimaleRenderer";
import { CategorisationRenderer } from "./renderers/CategorisationRenderer";
import { TexteLacunaireRenderer } from "./renderers/TexteLacunaireRenderer";
import { OpenRenderer } from "./renderers/OpenRenderer";

export interface ExerciseItem {
  id: string;
  type: string;
  gradingMode: string;
  prompt: string;
  payload: unknown;
  solution: unknown;
  commentary: string;
  groupId: string | null;
}

interface Props {
  item: ExerciseItem;
  onResult: (correct: boolean) => void;
  onNext: () => void;
}

type AttemptResult = { correct: boolean; commentary: string; expected?: unknown };

export function ExercisePlayer({ item, onResult, onNext }: Props) {
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(userAnswer: unknown) {
    if (result) return; // déjà soumis
    setSubmitting(true);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getUserId(), itemId: item.id, userAnswer }),
      });
      const data = (await res.json()) as AttemptResult;
      setResult(data);
      onResult(data.correct);
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    setResult(null);
    onNext();
  }

  const type = item.type;
  const isOpen = item.gradingMode === "OPEN";

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="text-encre font-medium leading-relaxed">{item.prompt}</p>

        <div className="mt-4">
          {type === "QCM" && (
            <QcmRenderer payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />
          )}
          {type === "TROUS" && (
            <TrousRenderer payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />
          )}
          {type === "ANOMALIE" && (
            <AnomalieRenderer payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />
          )}
          {(type === "APPARIEMENT" || type === "ETYMOLOGIE" || type === "COLLOCATION") && (
            <AppariementRenderer payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />
          )}
          {type === "VRAIFAUX" && (
            <VraiFauxRenderer payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />
          )}
          {(type === "REMPLACEMENT" || type === "TRANSFORMATION" || type === "CORRECTION" || type === "HOMOPHONIE" || type === "DEVINETTE") && (
            <SingleInputRenderer onSubmit={handleSubmit} disabled={!!result || submitting} />
          )}
          {type === "PAIRE_MINIMALE" && (
            <PaireMinimaleRenderer payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />
          )}
          {type === "CATEGORISATION" && (
            <CategorisationRenderer payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />
          )}
          {type === "TEXTE_LACUNAIRE" && (
            <TexteLacunaireRenderer payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />
          )}
          {isOpen && !["VRAIFAUX"].includes(type) && (
            <OpenRenderer onSubmit={handleSubmit} disabled={!!result || submitting} />
          )}
        </div>
      </Card>

      {/* Corrigé commenté */}
      {result && (
        <div
          className={`rounded-xl border-l-4 p-4 ${result.correct ? "border-green-500 bg-green-50" : "border-red-400 bg-red-50"}`}
          role="alert"
          aria-live="polite"
        >
          <p className="font-semibold">
            {result.correct ? "✓ Correct !" : "✗ Incorrect"}
          </p>
          {!result.correct && result.expected !== undefined && (
            <p className="text-sm mt-1">
              Attendu : <strong>{String(result.expected)}</strong>
            </p>
          )}
          <p className="text-sm mt-2 text-encre-soft leading-relaxed">{result.commentary}</p>
          <Button className="mt-3" size="sm" onClick={handleNext}>
            Suivant →
          </Button>
        </div>
      )}
    </div>
  );
}
