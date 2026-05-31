/**
 * Importe les groupes de paronymes depuis le DOCX alphabétique dans manual.ts.
 *
 * Usage : npx tsx scripts/import-alphabetiques.ts [--apply]
 * Sans --apply : dry-run, affiche le nombre de groupes nouveaux détectés.
 * Avec --apply : ajoute les nouvelles entrées à la fin de manual.ts.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { manualGroups } from "@/scripts/source-data/manual";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const TEXT = readFileSync(
  path.join(ROOT, "content/_extracted/Paronymes alphabétiques.docx.txt"),
  "utf-8"
);
const lines = TEXT.split("\n").map((l) => l.replace(/\r$/, ""));

// ── Normalisation (matching souple) ──────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['''`]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim();
}

function slugify(headwords: string[]): string {
  return headwords.map(normalize).join("-").replace(/\s+/g, "-");
}

// Catégorie → posClass
function posClassOf(cat: string): "VERBE" | "NOM_M" | "NOM_F" | "ADJECTIF" | "AUTRE" {
  const c = cat.toLowerCase();
  if (/^v\./.test(c)) return "VERBE";
  if (/n\.\s*m/.test(c) || /^m\./.test(c)) return "NOM_M";
  if (/n\.\s*f/.test(c) || /^f\./.test(c)) return "NOM_F";
  if (/^adj\./.test(c)) return "ADJECTIF";
  return "AUTRE";
}

// ── Patterns ─────────────────────────────────────────────────────────────────

// Titre de groupe : "Word1 & Word2" ou "Word1, Word2 & Word3"
const GROUP_TITLE_RE = /^([A-ZÀ-ŸÂÊÎÔÛÉÈÙÀÆŒÄËÏÖÜa-zA-ZÀ-ÿ][A-Za-zÀ-ÿ'\-\s(\/]*?)\s*&\s*.+$/;

// En-tête de mot : "Absorber v.tr.\tTraduction" ou "Accès m. :\tTraduction"
// Le mot peut contenir parenthèses, majuscules, tirets, etc.
const WORD_HEADER_RE =
  /^([A-ZÀ-ŸÂÊÎÔÛa-zA-ZÀ-ÿ][A-Za-zÀ-ÿ'\-\s\(\)]*?)\s{2,}(adj\.|v\.\s*tr\.|v\.\s*intr\.|v\.\s*pron\.|v\.\s*tr\.\s*ind\.|v\.\s*impers\.|n\.\s*m\.|n\.\s*f\.|f\.|m\.|adv\.)[^|]*?(?:\t(.*))?$/i;

// Alternative (tab entre mot+cat et traduction arménienne)
const WORD_HEADER_TAB_RE =
  /^([A-ZÀ-ŸÂÊÎÔÛa-zA-ZÀ-ÿ][A-Za-zÀ-ÿ'\-\s\(\)]{0,40}?)\s*(v\.tr\.|v\.intr\.|v\.pron\.|adj\.|n\.m\.|n\.f\.|f\.|m\.|adv\.)\s*:?\s*\t(.*)$/i;

const DEF_RE = /^Définition\s*:?\s*\t?(.*)/i;
const EX_START_RE = /^Exemples?\s*(d'utilisation\s*)?:?\s*/i;
const ORIGINE_RE = /^Origine\s*:?\s*(.*)/i;
const SYNON_RE = /^Synonymes?\s*:?\s*(.*)/i;
const SIGN_RE = /^Signification\s*:?\s*(.*)/i;

// ── Parsing ───────────────────────────────────────────────────────────────────

interface ParsedWord {
  headword: string;
  category: string;
  translationHy: string;
  definition: string;
  origin: string;
  synonyms: string;
  examples: string[];
}

interface ParsedGroup {
  title: string;
  words: ParsedWord[];
  summary: string;
}

const groups: ParsedGroup[] = [];
let currentGroup: ParsedGroup | null = null;
let currentWord: ParsedWord | null = null;
let inExamples = false;
let defContinuation = false;

function flushWord() {
  if (currentWord && currentGroup) {
    // Retire les sauts de ligne internes dans la définition
    currentWord.definition = currentWord.definition.replace(/\s+/g, " ").trim();
    currentGroup.words.push(currentWord);
    currentWord = null;
    inExamples = false;
    defContinuation = false;
  }
}

function flushGroup() {
  if (currentGroup) {
    flushWord();
    // Le résumé est le dernier "paragraphe" accumulé qui ne fait pas partie d'un mot
    currentGroup.summary = currentGroup.summary.replace(/\s+/g, " ").trim();
    if (currentGroup.words.length > 0) groups.push(currentGroup);
    currentGroup = null;
  }
}

for (let i = 0; i < lines.length; i++) {
  const raw = lines[i];
  const line = raw.trim();

  if (!line) {
    inExamples = false;
    defContinuation = false;
    continue;
  }

  // Détection titre de groupe
  const gm = GROUP_TITLE_RE.exec(line);
  if (gm && line.includes("&")) {
    flushGroup();
    currentGroup = { title: line.trim(), words: [], summary: "" };
    continue;
  }

  if (!currentGroup) continue;

  // Détection en-tête de mot (deux formes)
  const wm = WORD_HEADER_TAB_RE.exec(raw) ?? WORD_HEADER_RE.exec(raw);
  if (wm) {
    flushWord();
    currentWord = {
      headword: wm[1].trim(),
      category: wm[2].trim(),
      translationHy: (wm[3] ?? "").trim(),
      definition: "",
      origin: "",
      synonyms: "",
      examples: [],
    };
    inExamples = false;
    defContinuation = false;
    continue;
  }

  if (currentWord) {
    const dm = DEF_RE.exec(line) ?? SIGN_RE.exec(line);
    if (dm) {
      currentWord.definition = dm[1].trim();
      defContinuation = true;
      inExamples = false;
      continue;
    }
    if (EX_START_RE.test(line)) {
      inExamples = true;
      defContinuation = false;
      // Si la ligne contient du texte après le ":"
      const after = line.replace(EX_START_RE, "").trim();
      if (after) currentWord.examples.push(after);
      continue;
    }
    const om = ORIGINE_RE.exec(line);
    if (om) { currentWord.origin = om[1].trim(); defContinuation = false; continue; }
    const sm = SYNON_RE.exec(line);
    if (sm) { currentWord.synonyms = sm[1].trim(); defContinuation = false; continue; }

    if (inExamples) {
      currentWord.examples.push(line);
      continue;
    }
    if (defContinuation) {
      currentWord.definition += " " + line;
      continue;
    }
  } else {
    // Texte hors d'un mot dans le groupe → summary
    currentGroup.summary += (currentGroup.summary ? " " : "") + line;
  }
}
flushGroup();

console.log(`\n📊 Groupes extraits du DOCX : ${groups.length}`);

// ── Déduplication DOCX interne ────────────────────────────────────────────────

const seenSlugs = new Set<string>();
const uniqueGroups: ParsedGroup[] = [];
for (const g of groups) {
  const hw = g.words[0]?.headword ?? g.title.split(/\s*&\s*/)[0];
  const slug = normalize(hw);
  if (!seenSlugs.has(slug)) {
    seenSlugs.add(slug);
    uniqueGroups.push(g);
  }
}
console.log(`📊 Après déduplication DOCX   : ${uniqueGroups.length}`);

// ── Groupes déjà dans manual.ts ───────────────────────────────────────────────

const existingHeadwords = new Set<string>();
for (const g of manualGroups) {
  for (const w of g.words) existingHeadwords.add(normalize(w.headword));
}

const newGroups = uniqueGroups.filter((g) => {
  // Exclut les groupes déjà présents dans manual.ts
  if (g.words.some((w) => existingHeadwords.has(normalize(w.headword)))) return false;
  // Exclut les groupes mal parsés (< 2 mots, ou mot sans définition ni traduction)
  if (g.words.length < 2) return false;
  // Exclut les groupes où un mot n'a pas de définition
  if (g.words.some((w) => !w.definition.trim())) return false;
  return true;
});
console.log(`📊 Déjà dans manual.ts         : ${uniqueGroups.length - newGroups.length}`);
console.log(`📊 Nouveaux groupes à importer : ${newGroups.length}`);

if (newGroups.length > 0) {
  console.log("\n── Aperçu (5 premiers) ──");
  newGroups.slice(0, 5).forEach((g) => {
    console.log(`  ${g.title}`);
    g.words.forEach((w) => console.log(`    • ${w.headword} (${w.category}) — ${w.translationHy.slice(0, 40)}`));
  });
}

if (!APPLY) {
  console.log("\n💡 Relancez avec --apply pour ajouter les entrées à manual.ts");
  process.exit(0);
}

// ── Génération TypeScript ─────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}

function wordTs(w: ParsedWord): string {
  const lines: string[] = [
    `        headword: "${esc(w.headword)}",`,
    `        category: "${esc(w.category)}",`,
    `        posClass: "${posClassOf(w.category)}",`,
    `        translationHy: "${esc(w.translationHy)}",`,
    `        definition: "${esc(w.definition)}",`,
  ];
  if (w.origin) lines.push(`        origin: "${esc(w.origin)}",`);
  if (w.synonyms) lines.push(`        synonyms: "${esc(w.synonyms)}",`);
  // Au plus 3 exemples, non vides
  const exs = w.examples.filter((e) => e.trim().length > 4).slice(0, 3);
  if (exs.length > 0) {
    lines.push(`        examples: [${exs.map((e) => `"${esc(e)}"`).join(", ")}],`);
  } else {
    lines.push(`        examples: [],`);
  }
  lines.push(`        reviewNeeded: true,`);
  return `      {\n${lines.join("\n")}\n      }`;
}

function groupTs(g: ParsedGroup): string {
  const headwords = g.words.map((w) => w.headword);
  const slug = slugify(headwords);
  const letter = normalize(headwords[0])[0]?.toUpperCase() ?? "A";
  const summary = esc(g.summary || `Distinguer ${headwords.join(" et ")}.`);
  const wordsTs = g.words.map(wordTs).join(",\n");
  return `  {
    slug: "${slug}",
    title: "${esc(g.title)}",
    letter: "${letter}",
    summary: "${summary}",
    words: [
${wordsTs},
    ],
  },`;
}

// Lit manual.ts et insère avant le `];` final
let src = readFileSync(path.join(ROOT, "scripts/source-data/manual.ts"), "utf-8");
const insertionPoint = src.lastIndexOf("];");
if (insertionPoint === -1) {
  console.error("❌ Impossible de trouver le point d'insertion `];` dans manual.ts");
  process.exit(1);
}

const newEntries = newGroups.map(groupTs).join("\n");
src = src.slice(0, insertionPoint) + newEntries + "\n" + src.slice(insertionPoint);

writeFileSync(path.join(ROOT, "scripts/source-data/manual.ts"), src, "utf-8");
console.log(`\n✅ ${newGroups.length} groupes ajoutés → scripts/source-data/manual.ts`);
console.log("Relancez : npm run ingest && npm run db:seed");
