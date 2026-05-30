import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db";
import { manuelQuerySchema } from "@/src/lib/api-schemas";

export async function GET(req: NextRequest) {
  const parsed = manuelQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { letter, search, page, limit } = parsed.data;

  const where = {
    ...(letter && { letter: letter.toUpperCase() }),
    ...(search && {
      OR: [
        { title: { contains: search } },
        { words: { some: { headword: { contains: search } } } },
      ],
    }),
  };

  const [groups, total] = await Promise.all([
    prisma.paronymGroup.findMany({
      where,
      include: { words: true },
      orderBy: [{ letter: "asc" }, { title: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.paronymGroup.count({ where }),
  ]);

  return NextResponse.json({
    groups: groups.map((g) => ({
      ...g,
      words: g.words.map((w) => ({
        ...w,
        examples: JSON.parse(w.examples) as string[],
      })),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
