"use client";

import Link from "next/link";
import { EXERCISE_TYPE_META, EXERCISE_TYPES } from "@/src/lib/exercise-types";
import { Card } from "@/src/components/ui/Card";
import { BuildInfo } from "@/src/components/ui/BuildInfo";

const AUTO_TYPES = EXERCISE_TYPES.filter(
  (t) => EXERCISE_TYPE_META[t].defaultGrading === "AUTO",
);

export function ExercicesClient() {
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AUTO_TYPES.map((type) => {
          const meta = EXERCISE_TYPE_META[type];
          return (
            <Link key={type} href={`/exercices/${type.toLowerCase()}`}>
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <div className="flex flex-col gap-2 h-full">
                  <span className="font-serif font-semibold">{meta.label}</span>
                  <p className="text-encre-soft text-xs leading-relaxed flex-1">{meta.skill}</p>
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
          className="inline-flex items-center gap-2 text-xs text-encre-soft hover:text-encre transition-colors"
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
