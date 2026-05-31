import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db";
import { exercisesQuerySchema } from "@/src/lib/api-schemas";
import { getEffectiveUserId } from "@/src/server/identity";

export async function GET(req: NextRequest) {
  const parsed = exercisesQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { type, limit } = parsed.data;
  const userId = await getEffectiveUserId(parsed.data.userId);

  // Items déjà tentés par cet utilisateur
  let attemptedIds: string[] = [];
  if (userId) {
    const attempts = await prisma.attempt.findMany({
      where: { userId },
      select: { itemId: true },
      distinct: ["itemId"],
    });
    attemptedIds = attempts.map((a) => a.itemId);
  }

  // Sélection aléatoire — paramètres liés via Prisma pour éviter toute injection
  type Row = { id: string };

  async function randomItems(excludeAttempted: boolean): Promise<Row[]> {
    const notIn = excludeAttempted && attemptedIds.length > 0
      ? attemptedIds
      : [];

    // Prisma ne supporte pas ORDER BY RANDOM() nativement — on utilise $queryRaw
    // avec des paramètres liés ($1, $2…) pour la sécurité.
    if (type && notIn.length > 0) {
      return prisma.$queryRaw<Row[]>`
        SELECT id FROM "ExerciseItem"
        WHERE type = ${type}
          AND id NOT IN (${notIn.join(",") /* valeurs déjà validées comme cuid */})
        ORDER BY RANDOM() LIMIT ${limit}`;
    }
    if (type) {
      return prisma.$queryRaw<Row[]>`
        SELECT id FROM "ExerciseItem"
        WHERE type = ${type}
        ORDER BY RANDOM() LIMIT ${limit}`;
    }
    if (notIn.length > 0) {
      return prisma.$queryRaw<Row[]>`
        SELECT id FROM "ExerciseItem"
        WHERE id NOT IN (${notIn.join(",")})
        ORDER BY RANDOM() LIMIT ${limit}`;
    }
    return prisma.$queryRaw<Row[]>`
      SELECT id FROM "ExerciseItem"
      ORDER BY RANDOM() LIMIT ${limit}`;
  }

  let pool = await randomItems(true);
  const exhausted = pool.length === 0;

  if (exhausted) {
    // Tous les items tentés : on repart du catalogue complet
    pool = await randomItems(false);
  }

  if (pool.length === 0) {
    return NextResponse.json({ items: [], exhausted: false });
  }

  const ids = pool.map((r) => r.id);
  const items = await prisma.exerciseItem.findMany({ where: { id: { in: ids } } });
  const ordered = ids
    .map((id) => items.find((it) => it.id === id))
    .filter((it): it is NonNullable<typeof it> => !!it);

  return NextResponse.json({
    items: ordered.map(({ solution: _sol, ...it }) => ({
      ...it,
      payload: JSON.parse(it.payload) as unknown,
    })),
    exhausted,
  });
}
