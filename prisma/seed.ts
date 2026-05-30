/**
 * Seeding idempotent de la base depuis content/*.json (source de vérité).
 * Exécutable via `npm run db:seed`. Réexécutable sans doublon (upsert par slug).
 *
 * Sur tout environnement neuf (y compris la session cloud mobile) :
 *   npm install && npm run db:seed && npm run dev
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { manualFileSchema, exercisesFileSchema } from "../src/lib/content-schema";

const prisma = new PrismaClient();
const CONTENT = path.join(process.cwd(), "content");

async function readJson(file: string): Promise<unknown> {
  const raw = await readFile(path.join(CONTENT, file), "utf-8");
  return JSON.parse(raw);
}

async function main() {
  console.log("── Seeding ──");
  const manual = manualFileSchema.parse(await readJson("manual.json"));
  const exercises = exercisesFileSchema.parse(await readJson("exercises.json"));

  // 1. Groupes + mots vedettes.
  const slugToId = new Map<string, string>();
  for (const g of manual) {
    const group = await prisma.paronymGroup.upsert({
      where: { slug: g.slug },
      update: { title: g.title, letter: g.letter, summary: g.summary },
      create: { slug: g.slug, title: g.title, letter: g.letter, summary: g.summary },
    });
    slugToId.set(g.slug, group.id);

    // Mots : on remplace l'ensemble pour rester idempotent et refléter le contenu.
    await prisma.word.deleteMany({ where: { groupId: group.id } });
    await prisma.word.createMany({
      data: g.words.map((w) => ({
        groupId: group.id,
        headword: w.headword,
        category: w.category,
        posClass: w.posClass,
        translationHy: w.translationHy,
        definition: w.definition,
        origin: w.origin ?? null,
        synonyms: w.synonyms ?? null,
        examples: JSON.stringify(w.examples),
        reviewNeeded: w.reviewNeeded,
      })),
    });
  }
  console.log(`✅ ${manual.length} groupes, ${manual.reduce((n, g) => n + g.words.length, 0)} mots.`);

  // 2. Items d'exercices.
  let count = 0;
  for (const it of exercises) {
    const groupId = it.groupSlug ? (slugToId.get(it.groupSlug) ?? null) : null;
    const data = {
      type: it.type,
      gradingMode: it.gradingMode,
      prompt: it.prompt,
      payload: JSON.stringify(it.payload),
      solution: JSON.stringify(it.solution),
      commentary: it.commentary,
      groupId,
      posClass: it.posClass ?? null,
      source: it.source,
      reviewNeeded: it.reviewNeeded,
      orderIndex: it.orderIndex,
    };
    await prisma.exerciseItem.upsert({
      where: { slug: it.slug },
      update: data,
      create: { slug: it.slug, ...data },
    });
    count++;
  }
  console.log(`✅ ${count} items d'exercices.`);

  // 3. Utilisateur de démonstration (utile pour les tests et un premier essai).
  await prisma.user.upsert({
    where: { email: "demo@paro.local" },
    update: {},
    create: { email: "demo@paro.local", name: "Démo" },
  });
  console.log("✅ Utilisateur démo prêt.");
}

main()
  .catch((err) => {
    console.error("❌ Seeding échoué :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
