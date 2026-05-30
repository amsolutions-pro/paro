import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db";
import { statsQuerySchema } from "@/src/lib/api-schemas";

export async function GET(req: NextRequest) {
  const parsed = statsQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { userId } = parsed.data;

  const attempts = await prisma.attempt.findMany({
    where: { userId },
    include: { item: { select: { type: true, posClass: true } } },
    orderBy: { createdAt: "asc" },
  });

  const total = attempts.length;
  const correct = attempts.filter((a) => a.isCorrect).length;

  // Par catégorie grammaticale.
  const byPosClass: Record<string, { total: number; correct: number }> = {};
  for (const a of attempts) {
    const pc = a.item.posClass ?? "AUTRE";
    if (!byPosClass[pc]) byPosClass[pc] = { total: 0, correct: 0 };
    byPosClass[pc].total++;
    if (a.isCorrect) byPosClass[pc].correct++;
  }

  // Activité par jour (7 derniers jours).
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const recent = attempts.filter((a) => a.createdAt >= sevenDaysAgo);
  const activityByDay: Record<string, number> = {};
  for (const a of recent) {
    const day = a.createdAt.toISOString().slice(0, 10);
    activityByDay[day] = (activityByDay[day] ?? 0) + 1;
  }

  return NextResponse.json({
    total,
    correct,
    rate: total > 0 ? Math.round((correct / total) * 100) : 0,
    byPosClass,
    activityByDay,
  });
}
