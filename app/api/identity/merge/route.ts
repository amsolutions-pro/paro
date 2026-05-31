import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/server/db";
import { z } from "zod";

const schema = z.object({ anonId: z.string().min(1) });

/**
 * Rattache la progression anonyme (localStorage) au compte authentifié.
 * Appelé une seule fois côté client juste après la connexion.
 *
 * - Attempt : réaffectation directe (pas de contrainte d'unicité).
 * - ReviewState / SessionProgress : contrainte @@unique → fusion prudente
 *   (on conserve l'état déjà présent sur le compte, on supprime le doublon anonyme).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const target = session.user.id;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ merged: 0 });

  const anonId = parsed.data.anonId;
  if (!anonId.startsWith("anon_") || anonId === target) {
    return NextResponse.json({ merged: 0 });
  }

  // 1. Tentatives — réaffectation directe.
  const att = await prisma.attempt.updateMany({
    where: { userId: anonId },
    data: { userId: target },
  });

  // 2. États SRS — fusion sur (userId, groupId).
  const anonStates = await prisma.reviewState.findMany({ where: { userId: anonId } });
  for (const s of anonStates) {
    const exists = await prisma.reviewState.findUnique({
      where: { userId_groupId: { userId: target, groupId: s.groupId } },
    });
    if (!exists) {
      await prisma.reviewState.create({
        data: {
          userId: target,
          groupId: s.groupId,
          box: s.box,
          ease: s.ease,
          intervalDays: s.intervalDays,
          lapses: s.lapses,
          nextReview: s.nextReview,
        },
      });
    }
  }
  await prisma.reviewState.deleteMany({ where: { userId: anonId } });

  // 3. Progression de session — fusion sur (userId, sessionType).
  const anonProgress = await prisma.sessionProgress.findMany({ where: { userId: anonId } });
  for (const p of anonProgress) {
    const exists = await prisma.sessionProgress.findUnique({
      where: { userId_sessionType: { userId: target, sessionType: p.sessionType } },
    });
    if (!exists) {
      await prisma.sessionProgress.create({
        data: { userId: target, sessionType: p.sessionType, data: p.data },
      });
    }
  }
  await prisma.sessionProgress.deleteMany({ where: { userId: anonId } });

  return NextResponse.json({ merged: att.count });
}
