import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db";
import { isDue } from "@/src/domain/srs";
import { reviewQueueQuerySchema } from "@/src/lib/api-schemas";
import { getEffectiveUserId } from "@/src/server/identity";

export async function GET(req: NextRequest) {
  const parsed = reviewQueueQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { limit, all } = parsed.data;
  const userId = await getEffectiveUserId(parsed.data.userId);
  if (!userId) return NextResponse.json({ queue: [], totalDue: 0, totalTracked: 0, nextReviewAt: null });

  const reviewStates = await prisma.reviewState.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          items: { orderBy: { orderIndex: "asc" }, take: 3 },
        },
      },
    },
  });

  const now = new Date();
  const due = reviewStates.filter((rs) => isDue({ ...rs }, now));
  const notDue = reviewStates.filter((rs) => !isDue({ ...rs }, now));

  // Prochaine révision planifiée (la plus proche parmi les non-dues).
  const nextReviewAt = notDue.length > 0
    ? notDue.reduce((min, rs) =>
        rs.nextReview < min ? rs.nextReview : min, notDue[0].nextReview)
    : null;

  // Tri par priorité (lapses desc, nextReview asc).
  const sortByPrio = (arr: typeof reviewStates) =>
    [...arr].sort((a, b) => {
      if (b.lapses !== a.lapses) return b.lapses - a.lapses;
      return a.nextReview.getTime() - b.nextReview.getTime();
    });

  // Mode "tout réviser" : toutes les paires suivies, dues en premier.
  const sortedStates = all
    ? [...sortByPrio(due), ...sortByPrio(notDue)]
    : sortByPrio(due).slice(0, limit);

  const topGroups = sortedStates.map((rs) => ({
    groupId: rs.groupId,
    groupTitle: rs.group.title,
    box: rs.box,
    lapses: rs.lapses,
    nextReview: rs.nextReview,
    items: rs.group.items.map((it) => ({
      ...it,
      payload: JSON.parse(it.payload) as unknown,
      solution: JSON.parse(it.solution) as unknown,
    })),
  }));

  return NextResponse.json({
    queue: topGroups,
    totalDue: due.length,
    totalTracked: reviewStates.length,
    nextReviewAt,
  });
}
