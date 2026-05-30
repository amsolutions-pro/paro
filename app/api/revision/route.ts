import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db";
import { isDue, sortByPriority } from "@/src/domain/srs";
import { reviewQueueQuerySchema } from "@/src/lib/api-schemas";

export async function GET(req: NextRequest) {
  const parsed = reviewQueueQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { userId, limit } = parsed.data;

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
  const due = reviewStates.filter((rs) =>
    isDue(
      {
        box: rs.box,
        ease: rs.ease,
        intervalDays: rs.intervalDays,
        lapses: rs.lapses,
        nextReview: rs.nextReview,
      },
      now,
    ),
  );

  const sorted = sortByPriority(
    due.map((rs) => ({
      box: rs.box,
      ease: rs.ease,
      intervalDays: rs.intervalDays,
      lapses: rs.lapses,
      nextReview: rs.nextReview,
    })),
  );

  // Associe les items aux groupes triés par priorité.
  const priorityGroupIds = sorted
    .map((_, i) => due[i]?.groupId)
    .filter(Boolean) as string[];

  const topGroups = priorityGroupIds.slice(0, limit).map((gid) => {
    const rs = due.find((r) => r.groupId === gid)!;
    return {
      groupId: gid,
      groupTitle: rs.group.title,
      box: rs.box,
      lapses: rs.lapses,
      nextReview: rs.nextReview,
      items: rs.group.items.map((it) => ({
        ...it,
        payload: JSON.parse(it.payload) as unknown,
        solution: JSON.parse(it.solution) as unknown,
      })),
    };
  });

  return NextResponse.json({ queue: topGroups, totalDue: due.length });
}
