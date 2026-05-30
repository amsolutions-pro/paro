import { ExerciseSessionClient } from "@/src/components/exercises/ExerciseSessionClient";
import { EXERCISE_TYPE_META, EXERCISE_TYPES, type ExerciseType } from "@/src/lib/exercise-types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ExerciseTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const upperType = type.toUpperCase() as ExerciseType;
  if (!EXERCISE_TYPES.includes(upperType)) notFound();
  const meta = EXERCISE_TYPE_META[upperType];
  return <ExerciseSessionClient type={upperType} meta={meta} />;
}
