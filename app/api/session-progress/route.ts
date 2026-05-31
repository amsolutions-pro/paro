import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db";
import { z } from "zod";

const getSchema = z.object({
  userId: z.string().min(1),
  sessionType: z.string().min(1),
});

const postSchema = z.object({
  userId: z.string().min(1),
  sessionType: z.string().min(1),
  data: z.string().min(1), // JSON sérialisé côté client
});

export async function GET(req: NextRequest) {
  const parsed = getSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ progress: null });

  const { userId, sessionType } = parsed.data;
  const row = await prisma.sessionProgress.findUnique({
    where: { userId_sessionType: { userId, sessionType } },
    select: { data: true, updatedAt: true },
  });

  return NextResponse.json({ progress: row ?? null });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { userId, sessionType, data } = parsed.data;

  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });

  await prisma.sessionProgress.upsert({
    where: { userId_sessionType: { userId, sessionType } },
    update: { data },
    create: { userId, sessionType, data },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const parsed = getSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ ok: true });

  const { userId, sessionType } = parsed.data;
  await prisma.sessionProgress.deleteMany({
    where: { userId, sessionType },
  });

  return NextResponse.json({ ok: true });
}
