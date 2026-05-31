"use client";

import { useState, useEffect, useRef } from "react";
import { getUserId } from "@/src/lib/user-store";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";

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
import { ReecritureRenderer } from "./renderers/ReecritureRenderer";

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
  onBack?: () => void;
  canGoBack: boolean;
  /** Quand true, le compte a rebours automatique est desactive (mode revision). */
  noAutoAdvance?: boolean;
}

type AttemptResult = { correct: boolean; commentary: string; expected?: unknown };

export function ExercisePlayer({ item, onResult, onNext, onBack, canGoBack, noAutoAdvance }: Props) {
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Demarre le compte a rebours apres une reponse (sauf en mode revision)
  useEffect(() => {
    if (!result || noAutoAdvance) return;
    const delay = result.correct ? 3 : 7;
    setCountdown(delay);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c === null || c <= 1) {
          clearInterval(timerRef.current!);
          return null;
        }
        return c - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [result, noAutoAdvance]);

  // Passage automatique quand le compte atteint null apres avoir ete demarre
  const countdownJustExpired = useRef(false);
  useEffect(() => {
    if (result && countdown === null && countdownJustExpired.current) {
      countdownJustExpired.current = false;
      handleNext();
    }
  });
  useEffect(() => {
    if (countdown !== null) countdownJustExpired.current = true;
  }, [countdown]);

  async function handleSubmit(userAnswer: unknown) {
    if (result) return;
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
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setCountdown(null);
    setResult(null);
    onNext();
  }

  const type = item.type;
  const isOpen = item.gradingMode === "OPEN";

  const nextLabel = countdown !== null
    ? `Suivant (${countdown})`
    : "Suivant →";

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="text-encre font-medium leading-relaxed">{item.prompt}</p>
        <div className="mt-4">
          {type === "QCM" && <QcmRenderer key={item.id} payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />}
          {type === "TROUS" && <TrousRenderer key={item.id} payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />}
          {type === "ANOMALIE" && <AnomalieRenderer key={item.id} payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />}
          {(type === "APPARIEMENT" || type === "ETYMOLOGIE" || type === "COLLOCATION") && <AppariementRenderer key={item.id} payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} result={result} />}
          {type === "VRAIFAUX" && <VraiFauxRenderer key={item.id} payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />}
          {(type === "REMPLACEMENT" || type === "TRANSFORMATION" || type === "CORRECTION" || type === "HOMOPHONIE" || type === "DEVINETTE") && <SingleInputRenderer key={item.id} onSubmit={handleSubmit} disabled={!!result || submitting} />}
          {type === "PAIRE_MINIMALE" && <PaireMinimaleRenderer key={item.id} payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />}
          {type === "CATEGORISATION" && <CategorisationRenderer key={item.id} payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />}
          {type === "TEXTE_LACUNAIRE" && <TexteLacunaireRenderer key={item.id} payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />}
          {type === "REECRITURE" && <ReecritureRenderer key={item.id} payload={item.payload} onSubmit={handleSubmit} disabled={!!result || submitting} />}
          {isOpen && !["VRAIFAUX", "REECRITURE"].includes(type) && <OpenRenderer key={item.id} onSubmit={handleSubmit} disabled={!!result || submitting} />}
        </div>
      </Card>

      {/* Corrige commente */}
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

          <div className="mt-3 flex gap-2">
            {canGoBack && (
              <Button size="sm" variant="outline" onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setCountdown(null); setResult(null); onBack?.(); }}>
                ← Retour
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {nextLabel}
            </Button>
          </div>
        </div>
      )}

      {/* Bouton retour avant soumission (navigation libre) */}
      {!result && canGoBack && (
        <button
          type="button"
          onClick={() => { setResult(null); onBack?.(); }}
          className="self-start text-xs text-encre-soft hover:text-encre underline-offset-2 hover:underline"
        >
          ← Question precedente
        </button>
      )}
    </div>
  );
}
