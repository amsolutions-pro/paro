"use client";

import { useState, useEffect } from "react";
import { ExercisePlayer } from "@/src/components/exercises/ExercisePlayer";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { type ExerciseType, type ExerciseTypeMeta } from "@/src/lib/exercise-types";

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

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/exercices?type=${type}&limit=10`)
      .then((r) => r.json())
      .then((d: { items: Item[] }) => {
        if (!cancelled) { setItems(d.items); setLoading(false); }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [type]);

  function handleResult(correct: boolean) {
    if (correct) setScore((s) => s + 1);
  }

  function handleNext() {
    if (currentIdx + 1 >= items.length) {
      setDone(true);
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }

  if (loading) return <p className="text-encre-soft animate-pulse text-sm">Chargement…</p>;
  if (items.length === 0)
    return <p className="text-encre-soft text-sm">Aucun exercice disponible pour ce type.</p>;

  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-serif text-3xl font-bold">Session terminée</h1>
        <p className="text-encre-soft">
          Score : <strong>{score}</strong> / {items.length}
        </p>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => { setCurrentIdx(0); setScore(0); setDone(false); }}>
            Recommencer
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  const item = items[currentIdx];
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
      <ExercisePlayer
        item={item}
        onResult={handleResult}
        onNext={handleNext}
      />
    </div>
  );
}
