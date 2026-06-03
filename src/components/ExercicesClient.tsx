"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { EXERCISE_TYPE_META, EXERCISE_TYPES, type ExerciseType } from "@/src/lib/exercise-types";
import { Card } from "@/src/components/ui/Card";
import { BuildInfo } from "@/src/components/ui/BuildInfo";

const AUTO_TYPES = EXERCISE_TYPES.filter(
  (t) => EXERCISE_TYPE_META[t].defaultGrading === "AUTO",
);

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface SavedSession {
  items: unknown[];
  currentIdx: number;
  score: number;
  savedAt: number;
}

function detectSavedSessions(): Array<{ type: ExerciseType; session: SavedSession }> {
  try {
    const result: Array<{ type: ExerciseType; session: SavedSession }> = [];
    for (const type of EXERCISE_TYPES) {
      const raw = localStorage.getItem(`paro:session:${type}`);
      if (!raw) continue;
      const s = JSON.parse(raw) as SavedSession;
      if (Date.now() - s.savedAt > SESSION_TTL_MS) {
        localStorage.removeItem(`paro:session:${type}`);
        continue;
      }
      if (Array.isArray(s.items) && s.items.length > 0 && s.currentIdx < s.items.length) {
        result.push({ type, session: s });
      }
    }
    return result;
  } catch {
    return [];
  }
}

export function ExercicesClient() {
  const [savedSessions, setSavedSessions] = useState<
    Array<{ type: ExerciseType; session: SavedSession }>
  >([]);

  useEffect(() => {
    // Lecture localStorage réservée au client : impossible en SSR ou en init paresseuse
    // (provoquerait un décalage d'hydratation). Le setState au montage est donc voulu.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedSessions(detectSavedSessions());
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline gap-3">
        <h1 className="font-serif text-3xl font-bold">Exercices</h1>
        <BuildInfo />
      </div>
      <p className="text-encre-soft max-w-2xl text-sm">
        Quinze typologies d&apos;activités, du QCM à l&apos;appariement. Choisissez un type pour
        commencer une session.
      </p>

      {/* Sessions en cours */}
      {savedSessions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-encre-soft">
            En cours
          </p>
          {savedSessions.map(({ type, session }) => {
            const meta = EXERCISE_TYPE_META[type];
            const progress = Math.round((session.currentIdx / session.items.length) * 100);
            return (
              <Link key={type} href={`/exercices/${type.toLowerCase()}`}>
                <div className="flex cursor-pointer items-center gap-4 rounded-xl border border-lavande-200 bg-lavande-50 px-4 py-3 transition-colors hover:bg-lavande-100">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-encre">{meta.label}</p>
                    <p className="mt-0.5 text-xs text-encre-soft">
                      Question {session.currentIdx + 1} / {session.items.length}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-lavande-200">
                      <div
                        className="h-full rounded-full bg-lavande-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-lavande-600">Reprendre →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AUTO_TYPES.map((type) => {
          const meta = EXERCISE_TYPE_META[type];
          return (
            <Link key={type} href={`/exercices/${type.toLowerCase()}`}>
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <div className="flex h-full flex-col gap-2">
                  <span className="font-serif font-semibold">{meta.label}</span>
                  <p className="text-encre-soft flex-1 text-xs leading-relaxed">{meta.skill}</p>
                  <p className="text-lavande-500 text-xs font-medium">Exercice {meta.num} →</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Accès discret aux exercices libres */}
      <div className="mt-2 border-t border-grege-200 pt-4">
        <Link
          href="/exercices/libres"
          className="text-encre-soft hover:text-encre inline-flex items-center gap-2 text-xs transition-colors"
        >
          <span className="rounded-full border border-grege-300 bg-grege-100 px-2 py-0.5 font-medium">
            Exercices libres
          </span>
          <span>Production guidée, réécriture, traduction…</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
