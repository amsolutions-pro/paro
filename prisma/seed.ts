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

  // Audit des données utilisateur existantes — elles ne doivent jamais être effacées.
  const [attemptCount, reviewCount] = await Promise.all([
    prisma.attempt.count(),
    prisma.reviewState.count(),
  ]);
  console.log(`   ℹ️  Données utilisateur conservées : ${attemptCount} tentatives, ${reviewCount} états SRS.`);
  const manual = manualFileSchema.parse(await readJson("manual.json"));
  const exercises = [
    ...exercisesFileSchema.parse(await readJson("exercises.json")),
    ...exercisesFileSchema.parse(await readJson("exercises-quiz.json")),
    ...exercisesFileSchema.parse(await readJson("exercises-extra.json")),
  ];

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
  console.log(`✅ ${manual.length} fiches, ${manual.reduce((n, g) => n + g.words.length, 0)} mots.`);

  // 1bis. Purge des groupes retirés du contenu (dédup, fusion de familles…).
  // La base doit refléter exactement content/manual.json (seule source de vérité) :
  // sans ça, un groupe supprimé du JSON reste affiché sur le site (upsert ne supprime jamais).
  // Garde-fou : on ne purge QUE si le manuel a une taille plausible, pour éviter un
  // effacement massif si le JSON est tronqué/corrompu au moment du seed.
  const MIN_GROUPS = 100;
  if (manual.length >= MIN_GROUPS) {
    const keep = [...slugToId.keys()];
    const removed = await prisma.paronymGroup.deleteMany({ where: { slug: { notIn: keep } } });
    if (removed.count > 0) {
      // Cascade Prisma : mots supprimés ; exercices liés → groupId = NULL (onDelete: SetNull) ;
      // états de révision (ReviewState) de ces groupes supprimés.
      console.log(`🧹 ${removed.count} groupe(s) obsolète(s) supprimé(s) (absents du contenu).`);
    }
  } else {
    console.warn(`⚠️  Purge des groupes ignorée : seulement ${manual.length} chargés (< ${MIN_GROUPS}, garde-fou).`);
  }

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
