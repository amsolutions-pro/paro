/**
 * validate-content.ts — Valide les fichiers de contenu avec les schémas Zod
 * réels (ceux du seed) + vérifie l'intégrité des groupSlug d'exercices.
 * Lancement : npx tsx scripts/validate-content.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { manualFileSchema, exercisesFileSchema } from "../src/lib/content-schema";

const C = path.join(process.cwd(), "content");
const read = (f: string) => JSON.parse(readFileSync(path.join(C, f), "utf-8"));

let failed = false;

const manual = manualFileSchema.safeParse(read("manual.json"));
if (!manual.success) {
  failed = true;
  console.error("❌ manual.json invalide :");
  console.error(JSON.stringify(manual.error.issues.slice(0, 20), null, 2));
} else {
  console.log(`✅ manual.json : ${manual.data.length} groupes valides.`);
}

const exFiles = ["exercises.json", "exercises-quiz.json", "exercises-extra.json"];
const slugs = manual.success ? new Set(manual.data.map((g) => g.slug)) : new Set<string>();
let total = 0;
let orphans = 0;
for (const f of exFiles) {
  const parsed = exercisesFileSchema.safeParse(read(f));
  if (!parsed.success) {
    failed = true;
    console.error(`❌ ${f} invalide :`);
    console.error(JSON.stringify(parsed.error.issues.slice(0, 10), null, 2));
    continue;
  }
  console.log(`✅ ${f} : ${parsed.data.length} items valides.`);
  for (const it of parsed.data) {
    total++;
    if (it.groupSlug && !slugs.has(it.groupSlug)) orphans++;
  }
}
console.log(`\nIntégrité groupSlug : ${total} exercices, ${orphans} orphelin(s).`);
if (orphans > 0) failed = true;

process.exit(failed ? 1 : 0);
