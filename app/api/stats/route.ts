import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db";
import { statsQuerySchema } from "@/src/lib/api-schemas";
import { getEffectiveUserId } from "@/src/server/identity";

const EMPTY = { total: 0, correct: 0, rate: 0, byPosClass: {}, activityByDay: {} };

export async function GET(req: NextRequest) {
  const parsed = statsQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = await getEffectiveUserId(parsed.data.userId);
  if (!userId) return NextResponse.json(EMPTY);

  // Fenêtre des 7 derniers jours (jour courant inclus).
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setHours(0, 0, 0, 0);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  // Agrégations déléguées à PostgreSQL (pas de chargement de toutes les lignes).
  const [totals, byPos, byDay] = await Promise.all([
    prisma.$queryRaw<{ total: number; correct: number }[]>`
      SELECT COUNT(*)::int AS total,
             COALESCE(SUM(CASE WHEN "isCorrect" THEN 1 ELSE 0 END), 0)::int AS correct
      FROM "Attempt" WHERE "userId" = ${userId}`,
    prisma.$queryRaw<{ pc: string; total: number; correct: number }[]>`
      SELECT COALESCE(i."posClass", 'AUTRE') AS pc,
             COUNT(*)::int AS total,
             COALESCE(SUM(CASE WHEN a."isCorrect" THEN 1 ELSE 0 END), 0)::int AS correct
      FROM "Attempt" a
      JOIN "ExerciseItem" i ON i.id = a."itemId"
      WHERE a."userId" = ${userId}
      GROUP BY pc`,
    prisma.$queryRaw<{ day: string; count: number }[]>`
      SELECT to_char(a."createdAt"::date, 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS count
      FROM "Attempt" a
      WHERE a."userId" = ${userId} AND a."createdAt" >= ${sevenDaysAgo}
      GROUP BY day ORDER BY day`,
  ]);

  const total = totals[0]?.total ?? 0;
  const correct = totals[0]?.correct ?? 0;

  const byPosClass: Record<string, { total: number; correct: number }> = {};
  for (const r of byPos) byPosClass[r.pc] = { total: r.total, correct: r.correct };

  const activityByDay: Record<string, number> = {};
  for (const r of byDay) activityByDay[r.day] = r.count;

  return NextResponse.json({
    total,
    correct,
    rate: total > 0 ? Math.round((correct / total) * 100) : 0,
    byPosClass,
    activityByDay,
  });
}
