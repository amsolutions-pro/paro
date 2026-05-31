"use client";

import { useState, useEffect } from "react";
import { ExercisePlayer } from "@/src/components/exercises/ExercisePlayer";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { type ExerciseType, type ExerciseTypeMeta } from "@/src/lib/exercise-types";
import { getUserId } from "@/src/lib/user-store";

interface Item {
  id: string;
  type: string;
  gradingMode: string;
  prompt: string;
  payload: unknown;
  solution: unknown;
  commentary: string;
  groupId: string | null;
}

export function ExerciseSessionClient({
  type,
  meta,
}: {
  type: ExerciseType;
  meta: ExerciseTypeMeta;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  /**
   * maxVisited : indice le plus avance que l'utilisateur a atteint.
   * Quand currentIdx < maxVisited, l'utilisateur revient en arriere
   * et le compte a rebours automatique est desactive.
   */
  const [maxVisited, setMaxVisited] = useState(0);

  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const userId = getUserId();
    const params = new URLSearchParams({ type, limit: "10" });
    if (userId) params.set("userId", userId);
    fetch(`/api/exercices?${params}`)
      .then((r) => r.json())
      .then((d: { items: Item[]; exhausted?: boolean }) => {
        if (!cancelled) {
          setItems(d.items);
          setExhausted(d.exhausted ?? false);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [type]);

  function handleResult(correct: boolean) {
    if (correct) setScore((s) => s + 1);
  }

  function handleNext() {
    const next = currentIdx + 1;
    if (next >= items.length) {
      setDone(true);
    } else {
      setCurrentIdx(next);
      setMaxVisited((m) => Math.max(m, next));
    }
  }

  function handleBack() {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  }

  if (loading) return <p className="text-encre-soft animate-pulse text-sm">Chargement…</p>;
  if (items.length === 0)
    return <p className="text-encre-soft text-sm">Aucun exercice disponible pour ce type.</p>;


  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-serif text-3xl font-bold">Session terminee</h1>
        <p className="text-encre-soft">
          Score : <strong>{score}</strong> / {items.length}
        </p>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => { setCurrentIdx(0); setScore(0); setDone(false); setMaxVisited(0); }}>
            Recommencer
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Retour aux exercices
          </Button>
        </div>
      </div>
    );
  }

  const item = items[currentIdx];
  const isReviewing = currentIdx < maxVisited;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-2xl font-bold">{meta.label}</h1>
          <Badge>{meta.defaultGrading === "AUTO" ? "Auto" : "Ouvert"}</Badge>
        </div>
        <span className="text-encre-soft text-sm">
          {currentIdx + 1} / {items.length}
        </span>
      </div>

      {exhausted && (
        <p className="text-xs text-lavande-600 bg-lavande-50 border border-lavande-200 rounded px-3 py-1.5">
          Vous avez déjà vu tous les exercices de ce type — sélection aléatoire depuis l'ensemble du catalogue.
        </p>
      )}

      {isReviewing && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
          Mode revision — passage automatique desactive
        </p>
      )}

      <ExercisePlayer
        key={item.id}
        item={item}
        onResult={handleResult}
        onNext={handleNext}
        onBack={handleBack}
        canGoBack={currentIdx > 0}
        noAutoAdvance={isReviewing}
      />
    </div>
  );
}
