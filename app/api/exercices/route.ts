import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db";
import { exercisesQuerySchema } from "@/src/lib/api-schemas";

export async function GET(req: NextRequest) {
  const parsed = exercisesQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { type, page, limit } = parsed.data;

  const where = type ? { type } : {};
  const [items, total] = await Promise.all([
    prisma.exerciseItem.findMany({
      where,
      orderBy: [{ type: "asc" }, { orderIndex: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.exerciseItem.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((it) => ({
      ...it,
      payload: JSON.parse(it.payload) as unknown,
      solution: JSON.parse(it.solution) as unknown,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
