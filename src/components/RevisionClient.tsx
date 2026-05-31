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

export function RevisionClient() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [totalTracked, setTotalTracked] = useState(0);
  const [nextReviewAt, setNextReviewAt] = useState<string | null>(null);
  const [currentEntry, setCurrentEntry] = useState<QueueEntry | null>(null);
  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = getUserId();
    fetch(`/api/revision?userId=${encodeURIComponent(uid)}&limit=10`)
      .then((r) => r.json())
      .then((d: { queue: QueueEntry[]; totalDue: number; totalTracked: number; nextReviewAt: string | null }) => {
        setQueue(d.queue);
        setTotalDue(d.totalDue);
        setTotalTracked(d.totalTracked);
        setNextReviewAt(d.nextReviewAt);
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
        <ExercisePlayer item={item} onResult={() => {}} onNext={handleNext} canGoBack={false} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-3xl font-bold">Mes points faibles</h1>
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
        ) : (
          <p className="text-encre-soft text-sm">
            Aucune révision due pour l&apos;instant. Revenez dans quelques heures !
          </p>
        )}
        <div className="border-amber-300 bg-amber-50 rounded-lg border-l-4 p-3 text-sm">
          <p className="font-semibold text-encre">⚠️ Mode test — intervalles en heures</p>
          <p className="text-encre-soft mt-1">
            Chaque paire travaillée est planifiée selon l&apos;algorithme de Leitner :
            bonne réponse → intervalle allongé (1 h → 3 h → 7 h → 14 h → 30 h) ;
            mauvaise réponse → retour en boîte 1, révision dans 1 heure.
            Revenez régulièrement pour observer la dynamique du module.
          </p>
        </div>
      </div>

      {queue.length === 0 && totalTracked === 0 && (
        <p className="text-encre-soft text-sm">
          Faites des exercices pour alimenter la file de révision espacée.
        </p>
      )}
      {queue.length === 0 && totalTracked > 0 && (
        <p className="text-encre-soft text-sm">
          <strong>{totalTracked}</strong> paire{totalTracked > 1 ? "s" : ""} en suivi — aucune n&apos;est due pour l&apos;instant.
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
