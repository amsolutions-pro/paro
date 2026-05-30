"use client";

import { useState, useEffect } from "react";
import { getUserId } from "@/src/lib/user-store";
import { ExercisePlayer } from "@/src/components/exercises/ExercisePlayer";
import { Card } from "@/src/components/ui/Card";
import { Badge } from "@/src/components/ui/Badge";

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

export function RevisionClient() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [currentEntry, setCurrentEntry] = useState<QueueEntry | null>(null);
  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = getUserId();
    fetch(`/api/revision?userId=${encodeURIComponent(uid)}&limit=10`)
      .then((r) => r.json())
      .then((d: { queue: QueueEntry[]; totalDue: number }) => {
        setQueue(d.queue);
        setTotalDue(d.totalDue);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function startEntry(entry: QueueEntry) {
    setCurrentEntry(entry);
    setCurrentItemIdx(0);
  }

  function handleNext() {
    if (!currentEntry) return;
    if (currentItemIdx + 1 < currentEntry.items.length) {
      setCurrentItemIdx((i) => i + 1);
    } else {
      setCurrentEntry(null);
      setCurrentItemIdx(0);
    }
  }

  if (loading) return <p className="text-encre-soft animate-pulse text-sm">Chargement…</p>;

  if (currentEntry) {
    const item = currentEntry.items[currentItemIdx];
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-2xl font-bold">Révision</h1>
          <Badge variant="armenien">{currentEntry.groupTitle}</Badge>
        </div>
        <ExercisePlayer item={item} onResult={() => {}} onNext={handleNext} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="font-serif text-3xl font-bold">Mes points faibles</h1>
        {totalDue > 0 ? (
          <p className="text-encre-soft text-sm">
            <strong>{totalDue}</strong> paire{totalDue > 1 ? "s" : ""} à réviser aujourd&apos;hui.
          </p>
        ) : (
          <p className="text-encre-soft text-sm">
            Aucune révision due pour l&apos;instant. Revenez demain !
          </p>
        )}
        <div className="border-lavande-300 bg-lavande-50 rounded-lg border-l-4 p-3 text-sm">
          <p className="font-semibold text-encre">Comment fonctionne la révision espacée ?</p>
          <p className="text-encre-soft mt-1">
            Chaque paire que vous travaillez est planifiée pour révision selon l&apos;algorithme de Leitner :
            bonne réponse → intervalle doublé (1 j → 3 j → 7 j → 14 j → 30 j) ;
            mauvaise réponse → retour en boîte 1, révision dès le lendemain.
            Revenez chaque jour pour consolider votre mémoire à long terme.
          </p>
        </div>
      </div>

      {queue.length === 0 && (
        <p className="text-encre-soft text-sm">
          Faites des exercices pour alimenter la file de révision espacée.
        </p>
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
                onClick={() => startEntry(entry)}
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
