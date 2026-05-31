/**
 * Complète les translationHy vides de manual.ts depuis toutes les sources disponibles.
 *
 * Sources (par ordre de priorité décroissante) :
 *   1. content/_extracted/enriched-groups.json  (groupes structurés, translations curées)
 *   2. content/_extracted/alpha_parsed.json      (index mot→hy de l'alphabétique)
 *   3. content/docx-extracted-content.json       (extrait du manuel bilingue fr-hy)
 *
 * Usage : npx tsx scripts/patch-translations.ts [--apply]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const HY_RE = /[Ա-և]/;

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function cleanHy(s: string): string {
  return s
    .replace(/^[\t:\s]+/, "")
    .replace(/,\s*$/, "")
    .trim();
}

// ── Construction du lookup unifié ────────────────────────────────────────────

const lookup = new Map<string, string>(); // norm(headword) → translationHy

function addToLookup(key: string, hy: string, overwrite = false) {
  const k = norm(key);
  if (!k) return;
  const clean = cleanHy(hy);
  if (!HY_RE.test(clean)) return;
  if (overwrite || !lookup.has(k)) {
    lookup.set(k, clean);
  }
}

// Source 3 — docx-extracted-content.json (priorité basse)
const dcPath = path.join(ROOT, "content/docx-extracted-content.json");
if (existsSync(dcPath)) {
  const dc = JSON.parse(readFileSync(dcPath, "utf-8")) as Array<{
    headwords: string[];
    definitions: Record<string, string>;
    bonUsage: string;
  }>;
  for (const g of dc) {
    for (const hw of g.headwords) addToLookup(hw, ""); // defs only, no hy here
  }
}

// Source 2 — alpha_parsed.json (priorité moyenne)
const apPath = path.join(ROOT, "content/_extracted/alpha_parsed.json");
if (existsSync(apPath)) {
  const ap = JSON.parse(readFileSync(apPath, "utf-8")) as Record<
    string,
    { hy: string; definition: string; examples: string[] }
  >;
  for (const [key, val] of Object.entries(ap)) {
    if (val.hy) addToLookup(key, val.hy);
  }
}

// Source 1 — enriched-groups.json (priorité haute, écrase)
const egPath = path.join(ROOT, "content/_extracted/enriched-groups.json");
if (existsSync(egPath)) {
  const eg = JSON.parse(readFileSync(egPath, "utf-8")) as Array<{
    words: Array<{ headword: string; translationHy: string }>;
  }>;
  for (const g of eg) {
    for (const w of g.words ?? []) {
      if (w.translationHy) addToLookup(w.headword, w.translationHy, true);
    }
  }
}

console.log(`\n📚 Lookup unifié : ${lookup.size} mots avec traduction arménienne`);

// ── Patch ligne par ligne ─────────────────────────────────────────────────────

const src = readFileSync(path.join(ROOT, "scripts/source-data/manual.ts"), "utf-8");
const lines = src.split("\n");

let currentHeadword = "";
let patches = 0;
let skipped = 0;
const patchLog: string[] = [];

const HEADWORD_RE = /headword:\s*"([^"]+)"/;
const TRANSHY_EMPTY_RE = /^(\s*translationHy:\s*)""\s*,\s*$/;

const result = lines.map((line) => {
  const hwMatch = HEADWORD_RE.exec(line);
  if (hwMatch) {
    currentHeadword = hwMatch[1];
    return line;
  }

  const emptyMatch = TRANSHY_EMPTY_RE.exec(line);
  if (emptyMatch && currentHeadword) {
    const key = norm(currentHeadword);
    const hy = lookup.get(key);
    if (hy) {
      patches++;
      patchLog.push(`  ${currentHeadword} → ${hy.slice(0, 60)}`);
      return line.replace(/""/, `"${hy.replace(/"/g, '\\"')}"`);
    }
    skipped++;
  }

  return line;
});

const remaining = result.join("\n").match(/translationHy:\s*""/g)?.length ?? 0;

console.log(`\n✅ Traductions complétées : ${patches}`);
if (patchLog.length) console.log(patchLog.join("\n"));
console.log(`⚠️  Encore vides (source absente) : ${skipped}`);
console.log(`📊 translationHy vides restants : ${remaining}`);

if (!APPLY) {
  console.log("\n💡 Relancez avec --apply pour écrire les changements.");
  process.exit(0);
}

writeFileSync(path.join(ROOT, "scripts/source-data/manual.ts"), result.join("\n"), "utf-8");
console.log("\n📝 → scripts/source-data/manual.ts");
console.log("Relancez : npm run ingest && npm run db:seed");
