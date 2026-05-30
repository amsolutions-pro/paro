import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db";
import { grade } from "@/src/domain/grade";
import { updateSrs, initialSrsState } from "@/src/domain/srs";
import { submitAttemptSchema } from "@/src/lib/api-schemas";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = submitAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { userId, itemId, userAnswer } = parsed.data;

  // Vérification item + user (upsert user anonyme).
  const [item, user] = await Promise.all([
    prisma.exerciseItem.findUnique({ where: { id: itemId } }),
    prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    }),
  ]);

  if (!item) return NextResponse.json({ error: "Exercice introuvable." }, { status: 404 });

  const solution = JSON.parse(item.solution) as unknown;
  const result = grade(item.gradingMode === "AUTO" ? item.type : "OPEN", userAnswer, solution);

  // Enregistrement de la tentative.
  const attempt = await prisma.attempt.create({
    data: {
      userId: user.id,
      itemId: item.id,
      isCorrect: result.correct,
      userAnswer: JSON.stringify(userAnswer),
    },
  });

  // Mise à jour du ReviewState (SRS) si l'item est lié à un groupe.
  if (item.groupId) {
    const existing = await prisma.reviewState.findUnique({
      where: { userId_groupId: { userId: user.id, groupId: item.groupId } },
    });

    const now = new Date();
    if (existing) {
      const newState = updateSrs(
        {
          box: existing.box,
          ease: existing.ease,
          intervalDays: existing.intervalDays,
          lapses: existing.lapses,
          nextReview: existing.nextReview,
        },
        result.correct ? "correct" : "incorrect",
        now,
      );
      await prisma.reviewState.update({
        where: { id: existing.id },
        data: {
          box: newState.box,
          ease: newState.ease,
          intervalDays: newState.intervalDays,
          lapses: newState.lapses,
          nextReview: newState.nextReview,
        },
      });
    } else {
      const initState = initialSrsState(now);
      const newState = updateSrs(
        initState,
        result.correct ? "correct" : "incorrect",
        now,
      );
      await prisma.reviewState.create({
        data: {
          userId: user.id,
          groupId: item.groupId,
          box: newState.box,
          ease: newState.ease,
          intervalDays: newState.intervalDays,
          lapses: newState.lapses,
          nextReview: newState.nextReview,
        },
      });
    }
  }

  return NextResponse.json({
    attemptId: attempt.id,
    correct: result.correct,
    ...(!result.correct && "expected" in result ? { expected: result.expected } : {}),
    commentary: item.commentary,
  });
}
