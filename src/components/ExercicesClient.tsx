"use client";

import Link from "next/link";
import { EXERCISE_TYPE_META, EXERCISE_TYPES } from "@/src/lib/exercise-types";
import { Card } from "@/src/components/ui/Card";
import { Badge } from "@/src/components/ui/Badge";

export function ExercicesClient() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl font-bold">Exercices</h1>
      <p className="text-encre-soft max-w-2xl text-sm">
        Vingt typologies d&apos;activités, du QCM à la production guidée. Choisissez un type pour
        commencer une session.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EXERCISE_TYPES.map((type) => {
          const meta = EXERCISE_TYPE_META[type];
          return (
            <Link key={type} href={`/exercices/${type.toLowerCase()}`}>
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <div className="flex flex-col gap-2 h-full">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-serif font-semibold">{meta.label}</span>
                    <Badge variant={meta.defaultGrading === "AUTO" ? "default" : "armenien"}>
                      {meta.defaultGrading === "AUTO" ? "Auto" : "Ouvert"}
                    </Badge>
                  </div>
                  <p className="text-encre-soft text-xs leading-relaxed flex-1">{meta.skill}</p>
                  <p className="text-lavande-500 text-xs font-medium">
                    Exercice {meta.num} →
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
