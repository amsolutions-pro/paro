/**
 * Pipeline de contenu : docx → JSON (source de vérité).
 *
 * Voir DECISIONS.md (D3/D5). Le contenu structuré est curé dans scripts/source-data/
 * (fidèle au livret réel et au gabarit du manuel). Ce script :
 *   1. extrait le texte brut des .docx via `mammoth` (traçabilité / détection de
 *      changements de source) dans content/_extracted/ ;
 *   2. valide les données curées avec Zod ;
 *   3. complète chaque typologie jusqu'à 10 items (items « generated », reviewNeeded) ;
 *   4. écrit content/manual.json et content/exercises.json en UTF-8.
 *
 * Si un .docx est absent, on n'échoue pas : avertissement clair et on continue
 * (les JSON restent produits depuis les données curées).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { manualGroups } from "@/scripts/source-data/manual";
import { realItems } from "@/scripts/source-data/exercises";
import { buildFullItemSet } from "@/src/lib/generate-items";
import { manualFileSchema, exercisesFileSchema } from "@/src/lib/content-schema";
import { EXERCISE_TYPES } from "@/src/lib/exercise-types";

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const EXTRACTED = path.join(CONTENT, "_extracted");

const DOCX = {
  manuel: path.join(CONTENT, "Paronymes_manuel_fr-hy.docx"),
  livret: path.join(CONTENT, "Paronymes_livret_exercices.docx"),
};

async function extractRaw(name: string, file: string) {
  if (!existsSync(file)) {
    console.warn(`⚠️  Source absente : ${path.relative(ROOT, file)} — extraction ignorée (on continue).`);
    return;
  }
  try {
    const { value } = await mammoth.extractRawText({ path: file });
    await mkdir(EXTRACTED, { recursive: true });
    const out = path.join(EXTRACTED, `${name}.txt`);
    await writeFile(out, value, "utf-8");
    console.log(`📄 Texte brut extrait → ${path.relative(ROOT, out)} (${value.length} caractères).`);
  } catch (err) {
    console.warn(`⚠️  Échec d'extraction mammoth pour ${name} :`, (err as Error).message);
  }
}

async function main() {
  console.log("── Ingestion du contenu ──");

  // 1. Extraction brute (traçabilité).
  await extractRaw("manuel", DOCX.manuel);
  await extractRaw("livret", DOCX.livret);

  // 2. Validation du manuel.
  const manual = manualFileSchema.parse(manualGroups);

  // 3. Items réels + complément généré jusqu'à 10/type.
  const full = exercisesFileSchema.parse(buildFullItemSet(realItems, manualGroups));

  // Vérifie l'unicité des slugs.
  const slugs = new Set<string>();
  for (const it of full) {
    if (slugs.has(it.slug)) throw new Error(`Slug d'exercice dupliqué : ${it.slug}`);
    slugs.add(it.slug);
  }

  // 4. Écriture des JSON (UTF-8 strict).
  await mkdir(CONTENT, { recursive: true });
  await writeFile(path.join(CONTENT, "manual.json"), JSON.stringify(manual, null, 2) + "\n", "utf-8");
  await writeFile(path.join(CONTENT, "exercises.json"), JSON.stringify(full, null, 2) + "\n", "utf-8");

  // Bilan.
  const wordCount = manual.reduce((n, g) => n + g.words.length, 0);
  console.log(`\n✅ content/manual.json : ${manual.length} groupes, ${wordCount} mots vedettes.`);
  console.log(`✅ content/exercises.json : ${full.length} items.`);
  console.log("\nItems par typologie :");
  for (const type of EXERCISE_TYPES) {
    const items = full.filter((i) => i.type === type);
    const real = items.filter((i) => i.source === "manuel").length;
    const gen = items.length - real;
    const flag = items.length < 10 ? " ⚠️ < 10" : "";
    console.log(`  ${type.padEnd(16)} ${String(items.length).padStart(2)} (réels ${real}, générés ${gen})${flag}`);
  }
  const reviewNeeded = full.filter((i) => i.reviewNeeded).length;
  console.log(`\nℹ️  ${reviewNeeded} items marqués reviewNeeded (à relire).`);
}

main().catch((err) => {
  console.error("❌ Ingestion échouée :", err);
  process.exit(1);
});
