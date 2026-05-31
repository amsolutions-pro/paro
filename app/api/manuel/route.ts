import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/db";
import { manuelQuerySchema } from "@/src/lib/api-schemas";

/** Comptage des fiches par lettre — inclus dans toutes les réponses. */
async function getLetterCounts(): Promise<Record<string, number>> {
  type Row = { letter: string; n: number };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT letter, COUNT(*)::int AS n FROM "ParonymGroup" GROUP BY letter
  `;
  return Object.fromEntries(rows.map((r) => [r.letter, r.n]));
}

export async function GET(req: NextRequest) {
  // Supporte letter=A&letter=B (tableau) ou letter=A (simple)
  const raw = Object.fromEntries(req.nextUrl.searchParams) as Record<string, string | string[]>;
  const letterValues = req.nextUrl.searchParams.getAll("letter");
  if (letterValues.length > 1) raw.letter = letterValues;
  const parsed = manuelQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { letter, search, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  // letterCounts est inclus dans chaque réponse pour alimenter la navigation alphabétique.
  const letterCounts = await getLetterCounts();

  // Recherche globale (sans filtre lettre) — insensible à la casse et aux accents.
  if (search) {
    type GroupRow = { id: string };
    const matchingIds = await prisma.$queryRaw<GroupRow[]>`
      SELECT DISTINCT g.id
      FROM "ParonymGroup" g
      LEFT JOIN "Word" w ON w."groupId" = g.id
      WHERE (
          unaccent(lower(g.title))         LIKE '%' || unaccent(lower(${search})) || '%'
          OR unaccent(lower(w."headword")) LIKE '%' || unaccent(lower(${search})) || '%'
        )
    `;

    const ids = matchingIds.map((r) => r.id);
    const total = ids.length;

    const groups = await prisma.paronymGroup.findMany({
      where: { id: { in: ids } },
      include: { words: true },
      orderBy: [{ letter: "asc" }, { title: "asc" }],
      skip: offset,
      take: limit,
    });

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
      letterCounts,
    });
  }

  // Navigation par lettre(s) ou liste complète
  const letters = letter
    ? (Array.isArray(letter) ? letter : [letter]).map((l) => l.toUpperCase())
    : null;
  const where = letters ? { letter: { in: letters } } : {};

  const [groups, total] = await Promise.all([
    prisma.paronymGroup.findMany({
      where,
      include: { words: true },
      orderBy: [{ letter: "asc" }, { title: "asc" }],
      skip: offset,
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
    letterCounts,
  });
}
