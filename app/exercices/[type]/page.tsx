import { ExerciseSessionClient } from "@/src/components/exercises/ExerciseSessionClient";
import { EXERCISE_TYPE_META, EXERCISE_TYPES, type ExerciseType } from "@/src/lib/exercise-types";
import { auth } from "@/auth";
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
  const session = await auth();
  const isAuthed = !!session?.user?.id;
  return <ExerciseSessionClient type={upperType} meta={meta} isAuthed={isAuthed} />;
}
