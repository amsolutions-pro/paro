/**
 * Patch les définitions et "Le bon usage" de manual.ts
 * en utilisant le contenu extrait du DOCX.
 *
 * Usage : npx tsx scripts/patch-manual-definitions.ts [--apply]
 * Sans --apply : affiche seulement le diff (dry-run).
 * Avec --apply : écrit le nouveau manual.ts.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { manualGroups } from "@/scripts/source-data/manual";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");

// Charge le contenu extrait du DOCX.
const docxGroups = JSON.parse(
  readFileSync(path.join(ROOT, "content/docx-extracted-content.json"), "utf-8")
) as Array<{ headwords: string[]; definitions: Record<string, string>; bonUsage: string }>;

// Index headword → group entry (lower-case sans accents pour matching souple).
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // supprime accents
    .replace(/['']/g, "")
    .trim();
}

const docxByHeadword = new Map<string, typeof docxGroups[0]>();
for (const g of docxGroups) {
  for (const hw of g.headwords) {
    docxByHeadword.set(normalize(hw), g);
  }
}

interface Patch {
  groupSlug: string;
  wordPatches: Array<{ headword: string; oldDef: string; newDef: string }>;
  oldSummary: string;
  newSummary: string;
  matched: boolean;
}

const patches: Patch[] = [];

for (const group of manualGroups) {
  const wordPatches: Patch["wordPatches"] = [];
  let matchedGroup: typeof docxGroups[0] | undefined;
  let newSummary = group.summary;
  let matched = false;

  // Trouve le groupe DOCX via le premier mot qui matche.
  for (const word of group.words) {
    const key = normalize(word.headword);
    const found = docxByHeadword.get(key);
    if (found) {
      matchedGroup = found;
      break;
    }
  }

  if (matchedGroup) {
    matched = true;
    // Nouvelle définition pour chaque mot.
    for (const word of group.words) {
      const key = normalize(word.headword);
      const newDef = matchedGroup.definitions[key] ?? matchedGroup.definitions[
        // essai avec le headword exact tel que dans le DOCX
        Object.keys(matchedGroup.definitions).find(k => normalize(k) === key) ?? ""
      ];
      if (newDef && newDef !== word.definition) {
        wordPatches.push({
          headword: word.headword,
          oldDef: word.definition,
          newDef,
        });
      }
    }
    if (matchedGroup.bonUsage && matchedGroup.bonUsage !== group.summary) {
      newSummary = matchedGroup.bonUsage;
    }
  }

  patches.push({
    groupSlug: group.slug,
    wordPatches,
    oldSummary: group.summary,
    newSummary,
    matched,
  });
}

const matched = patches.filter(p => p.matched);
const unmatched = patches.filter(p => !p.matched);
const withChanges = patches.filter(p => p.wordPatches.length > 0 || p.newSummary !== p.oldSummary);

console.log(`\n📊 Résumé :`);
console.log(`  Groupes dans manual.ts     : ${patches.length}`);
console.log(`  Matchés dans le DOCX       : ${matched.length}`);
console.log(`  Non matchés                : ${unmatched.length}`);
console.log(`  Avec changements à appliquer : ${withChanges.length}`);

if (unmatched.length > 0) {
  console.log(`\n⚠️  Groupes non matchés :`);
  unmatched.forEach(p => console.log(`  - ${p.groupSlug}`));
}

console.log(`\n── Aperçu des changements (3 premiers) ──`);
withChanges.slice(0, 3).forEach(p => {
  console.log(`\n[${p.groupSlug}]`);
  p.wordPatches.forEach(w => {
    console.log(`  ${w.headword}:`);
    console.log(`    AVANT : "${w.oldDef.slice(0, 70)}…"`);
    console.log(`    APRÈS : "${w.newDef.slice(0, 70)}…"`);
  });
  if (p.newSummary !== p.oldSummary) {
    console.log(`  summary:`);
    console.log(`    AVANT : "${p.oldSummary.slice(0, 70)}…"`);
    console.log(`    APRÈS : "${p.newSummary.slice(0, 70)}…"`);
  }
});

if (!APPLY) {
  console.log(`\n💡 Relancez avec --apply pour écrire les changements dans manual.ts`);
  process.exit(0);
}

// ── Application : patch du fichier manual.ts source ──────────────────────────

let src = readFileSync(path.join(ROOT, "scripts/source-data/manual.ts"), "utf-8");

let applied = 0;

for (const patch of withChanges) {
  // Patch les définitions des mots.
  for (const w of patch.wordPatches) {
    // Remplace la ligne de définition exacte.
    const escaped = w.oldDef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(definition:\\s*)"${escaped}"`, "g");
    const newSrc = src.replace(re, `$1"${w.newDef.replace(/"/g, '\\"')}"`);
    if (newSrc !== src) { src = newSrc; applied++; }
    else {
      console.warn(`  ⚠️  Pas de match pour ${w.headword}: "${w.oldDef.slice(0, 50)}"`);
    }
  }

  // Patch le summary.
  if (patch.newSummary !== patch.oldSummary) {
    const escaped = patch.oldSummary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(summary:\\s*)"${escaped}"`, "g");
    const newSrc = src.replace(re, `$1"${patch.newSummary.replace(/"/g, '\\"')}"`);
    if (newSrc !== src) { src = newSrc; applied++; }
    else {
      // Try with template literal
      const re2 = new RegExp(`(summary:\\s*\`)[^\`]*\``, "g");
      const newSrc2 = src.replace(re2, (match, prefix) => {
        if (match.includes(patch.oldSummary.slice(0, 30))) {
          return `${prefix}${patch.newSummary.replace(/`/g, "'")}${"`"}`;
        }
        return match;
      });
      if (newSrc2 !== src) { src = newSrc2; applied++; }
      else {
        console.warn(`  ⚠️  Pas de match pour summary: "${patch.oldSummary.slice(0, 50)}"`);
      }
    }
  }
}

writeFileSync(path.join(ROOT, "scripts/source-data/manual.ts"), src, "utf-8");
console.log(`\n✅ ${applied} patches appliqués → scripts/source-data/manual.ts`);
console.log("Relancez maintenant : npm run ingest && npm run db:seed");
