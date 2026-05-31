import Link from "next/link";
import { EXERCISE_TYPE_META, EXERCISE_TYPES } from "@/src/lib/exercise-types";
import { Card } from "@/src/components/ui/Card";

export const dynamic = "force-dynamic";

const OPEN_TYPES = EXERCISE_TYPES.filter(
  (t) => EXERCISE_TYPE_META[t].defaultGrading === "OPEN",
);

export default function ExercicesLibresPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/exercices"
          className="text-xs text-encre-soft hover:text-encre transition-colors"
        >
          ← Retour aux exercices
        </Link>
      </div>

      <div>
        <h1 className="font-serif text-3xl font-bold">Exercices libres</h1>
        <p className="mt-2 text-encre-soft max-w-2xl text-sm">
          Ces exercices font appel à la production écrite libre : réécriture, contextualisation,
          traduction. Ils ne font pas l&apos;objet d&apos;une correction automatique — un corrigé
          de référence est disponible après soumission.
        </p>
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block">
          Ces exercices sont en cours de préparation — les contenus seront complétés prochainement.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {OPEN_TYPES.map((type) => {
          const meta = EXERCISE_TYPE_META[type];
          return (
            <Link key={type} href={`/exercices/${type.toLowerCase()}`}>
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <div className="flex flex-col gap-2 h-full">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-serif font-semibold">{meta.label}</span>
                    <span className="rounded-full border border-lavande-300 bg-lavande-50 px-2 py-0.5 text-xs font-medium text-lavande-700">
                      Libre
                    </span>
                  </div>
                  <p className="text-encre-soft text-xs leading-relaxed flex-1">{meta.skill}</p>
                  <p className="text-lavande-500 text-xs font-medium">Exercice {meta.num} →</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
