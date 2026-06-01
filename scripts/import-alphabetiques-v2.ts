/**
 * Import v2 — parser basé sur la détection de l'arménien dans les en-têtes de mots.
 * Cible les groupes non capturés par import-alphabetiques.ts (v1).
 *
 * Usage : npx tsx scripts/import-alphabetiques-v2.ts [--apply]
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const HY_RE = /[Ա-և]/;

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "").trim();
}

function slugify(headwords: string[]): string {
  return headwords.map((h) => norm(h)).join("-").replace(/\s+/g, "-");
}

function posClassOf(cat: string): "VERBE" | "NOM_M" | "NOM_F" | "ADJECTIF" | "AUTRE" {
  const c = cat.toLowerCase();
  if (/^v\./.test(c) || /^v\s/.test(c)) return "VERBE";
  if (/n\.\s*m|^m\./.test(c)) return "NOM_M";
  if (/n\.\s*f|^f\./.test(c)) return "NOM_F";
  if (/^adj/.test(c)) return "ADJECTIF";
  return "AUTRE";
}

// Inférence de catégorie grammaticale depuis le headword quand elle est absente
function inferCategory(headword: string): string {
  const w = headword.toLowerCase().replace(/[^a-zà-ÿ]/g, "");
  if (/er$|ir$|re$|oir$/.test(w)) return "v. tr.";
  if (/tion$|sion$|ité$|eur$|age$|ment$|ence$|ance$|ude$|ise$/.test(w)) return "n. f.";
  if (/isme$|eur$|ard$|ment$|age$/.test(w)) return "n. m.";
  if (/al$|el$|if$|eux$|able$|ible$|ant$|ent$|aire$/.test(w)) return "adj.";
  return "v. tr."; // défaut pour les paronymes non catégorisés
}

// ── Détection d'en-tête de mot (approche arménienne) ─────────────────────────
// Un en-tête de mot est une ligne qui :
//   1. Commence par une lettre majuscule
//   2. Contient du texte arménien
// On coupe à la première lettre arménienne pour séparer header / traduction.

const CAT_RE = /\s+(adj\.?(?:\s*[\(\-,][^\t\n]*)?|v\.?\s*(?:tr|intr|pron|impers)\.?(?:\s*ind\.?)?|n\.?\s*[mf]\.?|[mf]\.?|adv\.?)\s*:?\s*$/i;

interface WordHeader {
  headword: string;
  category: string;
  translationHy: string;
}

function extractWordHeader(raw: string): WordHeader | null {
  const line = raw.trim();
  // Doit commencer par une majuscule
  if (!/^[A-ZÀ-ŸÂÊÎÔÛÉÈÙÀÆŒa-zA-Z]/.test(line)) return null;
  // Doit contenir de l'arménien
  const armIdx = line.search(HY_RE);
  if (armIdx === -1) return null;

  const before = line.slice(0, armIdx).trimEnd();
  const hy = line.slice(armIdx).trim();

  // Extrait la catégorie de la partie avant
  const catMatch = CAT_RE.exec(before);
  if (catMatch) {
    const catStart = catMatch.index;
    let headword = before.slice(0, catStart)
      .replace(/[,\s]+$/, "")           // supprime virgule+espace finale (féminin)
      .replace(/\s*[\(\[][^\)\]]*[\)\]]$/, "") // supprime "(ve)", "(e)", etc.
      .trim();
    return { headword, category: catMatch[1].trim(), translationHy: hy };
  }

  // Fallback : tout avant le premier tab / double-espace / ":" = headword
  const splitMatch = before.match(/^([A-Za-zÀ-ÿ'\-\s()/]+?)[\t:]\s*$/);
  if (splitMatch) {
    return { headword: splitMatch[1].trim(), category: "", translationHy: hy };
  }

  // Dernier recours : coupe au premier espace ou tab après le mot
  const spaceIdx = before.search(/[\t\s]{2,}/);
  if (spaceIdx > 0) {
    return { headword: before.slice(0, spaceIdx).trim(), category: "", translationHy: hy };
  }

  return null;
}

// ── Parsing ───────────────────────────────────────────────────────────────────

const GROUP_TITLE_RE = /^([A-ZÀ-ŸÂÊÎÔÛÉÈÙÀÆŒa-zA-ZÀ-ÿ][A-Za-zÀ-ÿ'\-\s(\/]*?)\s*&\s*.+$/;
const DEF_RE = /^Définition\s*:?\s*\t?(.*)/i;
const SIGN_RE = /^Signification\s*:?\s*(.*)/i;
const EX_START_RE = /^Exemples?\s*(d'utilisation\s*)?:?\s*/i;
const SYNON_RE = /^Synonymes?\s*:?\s*(.*)/i;
const ORIGINE_RE = /^Origine\s*:?\s*(.*)/i;

interface ParsedWord {
  headword: string;
  category: string;
  translationHy: string;
  definition: string;
  origin: string;
  synonyms: string;
  examples: string[];
}
interface ParsedGroup { title: string; words: ParsedWord[]; summary: string }

const groups: ParsedGroup[] = [];
let cur: ParsedGroup | null = null;
let curWord: ParsedWord | null = null;
let inExamples = false;
let defCont = false;

function flushWord() {
  if (curWord && cur) {
    curWord.definition = curWord.definition.replace(/\s+/g, " ").trim();
    cur.words.push(curWord);
    curWord = null; inExamples = false; defCont = false;
  }
}
function flushGroup() {
  if (cur) {
    flushWord();
    cur.summary = cur.summary.replace(/\s+/g, " ").trim();
    if (cur.words.length > 0) groups.push(cur);
    cur = null;
  }
}

for (let i = 0; i < lines.length; i++) {
  const raw = lines[i];
  const line = raw.trim();
  if (!line) { inExamples = false; defCont = false; continue; }

  // Titre de groupe
  if (line.includes("&") && GROUP_TITLE_RE.test(line)) {
    flushGroup();
    cur = { title: line.trim(), words: [], summary: "" };
    continue;
  }
  if (!cur) continue;

  // En-tête de mot (approche arménienne)
  const wh = extractWordHeader(raw);
  if (wh && wh.headword.length >= 2) {
    flushWord();
    // Catégorie manquante → inférence depuis le headword
    if (!wh.category) wh.category = inferCategory(wh.headword);
    curWord = { ...wh, definition: "", origin: "", synonyms: "", examples: [] };
    inExamples = false; defCont = false;
    continue;
  }

  if (curWord) {
    const dm = DEF_RE.exec(line) ?? SIGN_RE.exec(line);
    if (dm) { curWord.definition = dm[1].trim(); defCont = true; inExamples = false; continue; }
    if (EX_START_RE.test(line)) {
      inExamples = true; defCont = false;
      const after = line.replace(EX_START_RE, "").trim();
      if (after) curWord.examples.push(after);
      continue;
    }
    const om = ORIGINE_RE.exec(line);
    if (om) { curWord.origin = om[1].trim(); defCont = false; continue; }
    const sm = SYNON_RE.exec(line);
    if (sm) { curWord.synonyms = sm[1].trim(); defCont = false; continue; }
    if (inExamples) { curWord.examples.push(line); continue; }
    if (defCont) { curWord.definition += " " + line; continue; }
  } else {
    cur.summary += (cur.summary ? " " : "") + line;
  }
}
flushGroup();

// ── Filtre qualité ────────────────────────────────────────────────────────────

// Déduplique par premier mot
const seenDoc = new Set<string>();
const unique = groups.filter((g) => {
  const hw = norm(g.words[0]?.headword ?? g.title.split(/\s*&\s*/)[0]);
  if (seenDoc.has(hw)) return false;
  seenDoc.add(hw); return true;
});

// Exclut déjà présents dans manual.ts
const existingHW = new Set<string>();
for (const g of manualGroups) for (const w of g.words) existingHW.add(norm(w.headword));

const newGroups = unique.filter((g) => {
  if (g.words.some((w) => existingHW.has(norm(w.headword)))) return false;
  if (g.words.length < 2) return false;
  if (g.words.some((w) => !w.definition.trim())) return false;
  if (g.words.some((w) => !w.category.trim())) return false;
  return true;
});

console.log(`\n📊 Groupes parsés v2     : ${unique.length}`);
console.log(`📊 Déjà dans manual.ts   : ${unique.length - newGroups.length - unique.filter(g => g.words.some(w => !existingHW.has(norm(w.headword))) && g.words.length >= 2 && !g.words.some(w => !w.definition.trim()) === false).length}`);
console.log(`📊 Nouveaux importables  : ${newGroups.length}`);
console.log("\n── Aperçu (8 premiers) ──");
newGroups.slice(0, 8).forEach((g) => {
  console.log(`  ${g.title}`);
  g.words.forEach((w) => console.log(`    • ${w.headword} (${w.category}) — ${w.translationHy.slice(0, 50)}`));
});

if (!APPLY) {
  console.log("\n💡 Relancez avec --apply pour ajouter à manual.ts");
  process.exit(0);
}

// ── Génération TypeScript ─────────────────────────────────────────────────────

function esc(s: string) { return s.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g," "); }

function groupTs(g: ParsedGroup): string {
  const headwords = g.words.map((w) => w.headword);
  const slug = slugify(headwords);
  const letter = norm(headwords[0])[0]?.toUpperCase() ?? "A";
  const summary = esc(g.summary || `Distinguer ${headwords.join(" et ")}.`);
  const wordsTs = g.words.map((w) => {
    const exs = w.examples.filter((e) => e.trim().length > 4).slice(0, 3);
    const lines = [
      `        headword: "${esc(w.headword)}",`,
      `        category: "${esc(w.category)}",`,
      `        posClass: "${posClassOf(w.category)}",`,
      `        translationHy: "${esc(w.translationHy)}",`,
      `        definition: "${esc(w.definition)}",`,
      ...(w.origin ? [`        origin: "${esc(w.origin)}",`] : []),
      ...(w.synonyms ? [`        synonyms: "${esc(w.synonyms)}",`] : []),
      `        examples: [${exs.map((e) => `"${esc(e)}"`).join(", ")}],`,
      `        reviewNeeded: true,`,
    ];
    return `      {\n${lines.join("\n")}\n      }`;
  }).join(",\n");
  return `  {\n    slug: "${slug}",\n    title: "${esc(g.title)}",\n    letter: "${letter}",\n    summary: "${summary}",\n    words: [\n${wordsTs},\n    ],\n  },`;
}

let src = readFileSync(path.join(ROOT, "scripts/source-data/manual.ts"), "utf-8");
const insertionPoint = src.lastIndexOf("];");
if (insertionPoint === -1) { console.error("❌ `];` introuvable"); process.exit(1); }
const newEntries = newGroups.map(groupTs).join("\n");
src = src.slice(0, insertionPoint) + newEntries + "\n" + src.slice(insertionPoint);
writeFileSync(path.join(ROOT, "scripts/source-data/manual.ts"), src, "utf-8");
console.log(`\n✅ ${newGroups.length} groupes ajoutés → manual.ts`);
console.log("Relancez : npm run ingest && npm run db:seed");
