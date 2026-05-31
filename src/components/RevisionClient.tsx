"use client";

import { useState, useEffect } from "react";
import { getUserId } from "@/src/lib/user-store";
import { ExercisePlayer } from "@/src/components/exercises/ExercisePlayer";
import { Card } from "@/src/components/ui/Card";
import { Badge } from "@/src/components/ui/Badge";
import { BuildInfo } from "@/src/components/ui/BuildInfo";

interface QueueEntry {
  groupId: string;
  groupTitle: string;
  box: number;
  lapses: number;
  nextReview: string;
  items: {
    id: string;
    type: string;
    gradingMode: string;
    prompt: string;
    payload: unknown;
    solution: unknown;
    commentary: string;
    groupId: string | null;
  }[];
}

type ApiResponse = { queue: QueueEntry[]; totalDue: number; totalTracked: number; nextReviewAt: string | null };

export function RevisionClient() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [totalTracked, setTotalTracked] = useState(0);
  const [nextReviewAt, setNextReviewAt] = useState<string | null>(null);
  const [currentEntry, setCurrentEntry] = useState<QueueEntry | null>(null);
  const [currentEntryQueue, setCurrentEntryQueue] = useState<QueueEntry[]>([]);
  const [currentEntryIdx, setCurrentEntryIdx] = useState(0);
  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    const uid = getUserId();
    fetch(`/api/revision?userId=${encodeURIComponent(uid)}&limit=10`)
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        setQueue(d.queue);
        setTotalDue(d.totalDue);
        setTotalTracked(d.totalTracked);
        setNextReviewAt(d.nextReviewAt);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function startSingleEntry(entry: QueueEntry) {
    setCurrentEntryQueue([entry]);
    setCurrentEntryIdx(0);
    setCurrentEntry(entry);
    setCurrentItemIdx(0);
  }

  async function handleToutReviser() {
    setLoadingAll(true);
    const uid = getUserId();
    try {
      const d = await fetch(`/api/revision?userId=${encodeURIComponent(uid)}&all=true`).then(r => r.json()) as ApiResponse;
      if (d.queue.length > 0) {
        setCurrentEntryQueue(d.queue);
        setCurrentEntryIdx(0);
        setCurrentEntry(d.queue[0]);
        setCurrentItemIdx(0);
      }
    } finally {
      setLoadingAll(false);
    }
  }

  function handleNext() {
    if (!currentEntry) return;
    if (currentItemIdx + 1 < currentEntry.items.length) {
      setCurrentItemIdx((i) => i + 1);
      return;
    }
    // Fin des items de cette entrée — passe à l'entrée suivante
    const nextIdx = currentEntryIdx + 1;
    if (nextIdx < currentEntryQueue.length) {
      setCurrentEntryIdx(nextIdx);
      setCurrentEntry(currentEntryQueue[nextIdx]);
      setCurrentItemIdx(0);
    } else {
      setCurrentEntry(null);
      setCurrentEntryIdx(0);
      setCurrentItemIdx(0);
    }
  }

  if (loading) return <p className="text-encre-soft animate-pulse text-sm">Chargement…</p>;

  if (currentEntry) {
    const item = currentEntry.items[currentItemIdx];
    const progress = currentEntryQueue.length > 1
      ? `${currentEntryIdx + 1} / ${currentEntryQueue.length}`
      : null;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-serif text-2xl font-bold">Révisions</h1>
          <Badge variant="armenien">{currentEntry.groupTitle}</Badge>
          {progress && <span className="text-encre-soft text-sm">{progress}</span>}
        </div>
        <ExercisePlayer item={item} onResult={() => {}} onNext={handleNext} canGoBack={false} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-3xl font-bold">Révisions</h1>
          <BuildInfo />
        </div>
        {totalDue > 0 ? (
          <p className="text-encre-soft text-sm">
            <strong>{totalDue}</strong> paire{totalDue > 1 ? "s" : ""} à réviser maintenant.
          </p>
        ) : totalTracked > 0 ? (
          <p className="text-encre-soft text-sm">
            Aucune révision due pour l&apos;instant.{" "}
            {nextReviewAt ? (
              <>Prochaine session : <strong>{new Date(nextReviewAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong>.</>
            ) : (
              "Revenez dans quelques heures !"
            )}
          </p>
        ) : null}
        <div className="border-grege-300 bg-grege-50 rounded-lg border p-3 text-sm text-encre-soft">
          Algorithme de Leitner (5 boîtes) — bonne réponse : intervalle allongé
          (1 j → 3 j → 7 j → 14 j → 30 j) ; mauvaise réponse : retour en boîte 1.
        </div>
      </div>

      {totalTracked === 0 && (
        <p className="text-encre-soft text-sm">
          Faites des exercices pour alimenter la file de révision espacée.
        </p>
      )}

      {/* Bouton "Tout réviser" */}
      {totalTracked > 0 && (
        <div className="flex items-center gap-3">
          {queue.length > 0 && (
            <p className="text-encre-soft text-sm flex-1">
              <strong>{totalTracked}</strong> paire{totalTracked > 1 ? "s" : ""} en suivi
            </p>
          )}
          <button
            onClick={handleToutReviser}
            disabled={loadingAll}
            className="border-lavande-300 text-lavande-700 hover:bg-lavande-100 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loadingAll ? "Chargement…" : `Tout réviser (${totalTracked})`}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {queue.map((entry) => (
          <Card key={entry.groupId}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-serif font-semibold">{entry.groupTitle}</p>
                <div className="flex gap-2 mt-1">
                  <Badge>Boîte {entry.box}/5</Badge>
                  {entry.lapses > 0 && (
                    <Badge variant="warning">{entry.lapses} échec{entry.lapses > 1 ? "s" : ""}</Badge>
                  )}
                </div>
              </div>
              <button
                onClick={() => startSingleEntry(entry)}
                className="bg-lavande-500 hover:bg-lavande-700 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                Réviser →
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
