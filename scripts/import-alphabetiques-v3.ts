/**
 * Import v3 — cible les ~18 groupes non capturés par v1/v2.
 *
 * Corrections vs v2 :
 *  1. GROUP_TITLE_RE : autorise les virgules dans le titre
 *  2. Détection "et" (français) en plus de "&"
 *  3. CAT_RE : ajoute s. (substantif)
 *  4. Nettoyage suffixes de genre : ", ale", ", ine", " ale", etc.
 *  5. Cas tab-sans-catégorie : Arborer\t, Effusion\t, Maudire\t
 *  6. Préfixe article : "La dénotation" → "dénotation"
 *  7. Annotations de prononciation : [magna] ou [maɲa] → supprimées
 *  8. Ponctuation arménienne : ․ (U+2024) normalisée en .
 *
 * Usage : npx tsx scripts/import-alphabetiques-v3.ts [--apply]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { manualGroups } from "@/scripts/source-data/manual";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");

const RAW_TEXT = readFileSync(
  path.join(ROOT, "content/_extracted/Paronymes alphabétiques.docx.txt"),
  "utf-8"
);
// Normalise la ponctuation arménienne (U+2024 ONE DOT LEADER → .)
const TEXT = RAW_TEXT.replace(/․/g, ".").replace(/։/g, ".");
const lines = TEXT.split("\n").map((l) => l.replace(/\r$/, ""));

// ── Helpers ───────────────────────────────────────────────────────────────────

const HY_RE = /[Ա-և]/;

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function slugify(headwords: string[]): string {
  return headwords
    .map((h) => norm(h))
    .join("-")
    .replace(/\s+/g, "-");
}

function posClassOf(cat: string): "VERBE" | "NOM_M" | "NOM_F" | "ADJECTIF" | "AUTRE" {
  const c = cat.toLowerCase();
  if (/^v\./.test(c) || /^v\s/.test(c)) return "VERBE";
  if (/n\.\s*m|^m\./.test(c)) return "NOM_M";
  if (/n\.\s*f|^f\./.test(c)) return "NOM_F";
  if (/^adj/.test(c)) return "ADJECTIF";
  return "AUTRE";
}

function inferCategory(headword: string): string {
  const w = headword.toLowerCase().replace(/[^a-zà-ÿ]/g, "");
  if (/er$|ir$|re$|oir$/.test(w)) return "v. tr.";
  if (/tion$|sion$|ité$|age$|ment$|ence$|ance$|ude$|ise$/.test(w)) return "n. f.";
  if (/isme$|ard$/.test(w)) return "n. m.";
  if (/al$|el$|if$|eux$|able$|ible$|ant$|ent$|aire$/.test(w)) return "adj.";
  return "v. tr.";
}

// Supprime le suffixe de genre du headword : "Amoral, ale" → "Amoral"
const GENDER_SUFFIX_RE =
  /,\s+(?:ale?|ine?|ienne?|ente?|trice?|rice?|euse?|eux?|onne?|ette?|ier?|ière?|ée?|[a-zà-ÿ]{1,8})\b.*$/i;
const GENDER_SPACE_RE =
  /\s+(?:ale?|ine?|ielle?|elle?|ière?|eux|ieuse|euse|ienne|ette|ente)\b.*$/i;

function cleanHeadword(raw: string): string {
  let hw = raw.trim()
    // 1. Supprime "ou [prononc]" avant de supprimer les [...]
    .replace(/\s+ou\s+\[.*?\]/gi, "")
    // 2. Supprime les annotations entre crochets : [magna], [ɛskatɔlɔʒi]
    .replace(/\s*\[.*?\]/g, "")
    // 3. Supprime les annotations entre parenthèses en fin : (ve), (e), (ive)
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .trim();
  // 4. Préfixe article : "La/Le/L'/Les"
  hw = hw.replace(/^(?:La|Le|Les?|L')\s+/i, "");
  // 5. Suffixe de genre avec virgule : "Amoral, ale" / "Usagé, ée"
  hw = hw.replace(GENDER_SUFFIX_RE, "");
  // 6. Suffixe de genre sans virgule : "Cérébral ale"
  hw = hw.replace(GENDER_SPACE_RE, "");
  return hw.trim();
}

// ── Détection d'en-tête de mot ────────────────────────────────────────────────

const CAT_RE =
  /\s+(adj\.?(?:\s*[\(\-,][^\t\n]*)?|v\.?\s*(?:tr|intr|pron|impers)\.?(?:\s*ind\.?)?|n\.?\s*[mf]\.?|[mf]\.?|s\.?|adv\.?)\s*:?\s*$/i;

interface WordHeader {
  headword: string;
  category: string;
  translationHy: string;
}

function extractWordHeader(raw: string): WordHeader | null {
  const line = raw.trim();
  if (!/^[A-ZÀ-ŸÂÊÎÔÛÉÈÙÀÆŒa-zA-Z]/.test(line)) return null;
  const armIdx = line.search(HY_RE);
  if (armIdx === -1) return null;

  const rawBeforeArm = line.slice(0, armIdx); // avant trimEnd
  const before = rawBeforeArm.trimEnd();
  const hy = line.slice(armIdx).trim();

  // Cas 1 : catégorie explicite (adj., v. tr., m., f., s., etc.)
  const catMatch = CAT_RE.exec(before);
  if (catMatch) {
    const hw = cleanHeadword(before.slice(0, catMatch.index));
    if (hw.length >= 2) return { headword: hw, category: catMatch[1].trim(), translationHy: hy };
  }

  // Cas 2 : séparateur tab → "Arborer\ttraduction arménienne"
  if (rawBeforeArm.includes("\t")) {
    const hw = cleanHeadword(rawBeforeArm.split("\t")[0]);
    if (hw.length >= 2 && /^[A-ZÀ-ÿ][A-Za-zÀ-ÿ'\-]+$/.test(hw)) {
      return { headword: hw, category: "", translationHy: hy };
    }
  }

  // Cas 3 : "Mot :  traduction" avec colon
  const colonSplit = before.match(/^([A-Za-zÀ-ÿ'\-\s()/]+?):\s*$/);
  if (colonSplit) {
    const hw = cleanHeadword(colonSplit[1]);
    if (hw.length >= 2) return { headword: hw, category: "", translationHy: hy };
  }

  // Cas 4 : double espace avant la traduction
  const spaceIdx = before.search(/\s{2,}/);
  if (spaceIdx > 0) {
    const hw = cleanHeadword(before.slice(0, spaceIdx));
    if (hw.length >= 2 && /^[A-ZÀ-ÿ][A-Za-zÀ-ÿ'\-\s]*$/.test(hw)) {
      return { headword: hw, category: "", translationHy: hy };
    }
  }

  return null;
}

// ── Détection de titre de groupe ──────────────────────────────────────────────
// Autorise : virgules, "et" en plus de "&"

const TITLE_CHAR_RE = /^[A-ZÀ-ÿ][A-Za-zÀ-ÿ',\-\s(\/]*/;

function isGroupTitle(line: string): boolean {
  const t = line.trim();
  // Forme avec & (peut avoir virgules : "Cinéphile, Cynophile & Sinophile")
  if (t.includes("&") && TITLE_CHAR_RE.test(t) && /\s*&\s*[A-ZÀ-ÿ]/.test(t)) return true;
  // Forme avec "et" : "Anoblir et Ennoblir" — titre pur sans contenu supplémentaire
  if (
    /^[A-ZÀ-ÿ][A-Za-zÀ-ÿ',\-\s]*\s+et\s+[A-ZÀ-ÿ][A-Za-zÀ-ÿ',\-\s]*$/.test(t)
  )
    return true;
  return false;
}

// ── Parsing ───────────────────────────────────────────────────────────────────

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
interface ParsedGroup {
  title: string;
  words: ParsedWord[];
  summary: string;
}

const groups: ParsedGroup[] = [];
let cur: ParsedGroup | null = null;
let curWord: ParsedWord | null = null;
let inExamples = false;
let defCont = false;

function flushWord() {
  if (curWord && cur) {
    curWord.definition = curWord.definition.replace(/\s+/g, " ").trim();
    cur.words.push(curWord);
    curWord = null;
    inExamples = false;
    defCont = false;
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
  if (!line) {
    inExamples = false;
    defCont = false;
    continue;
  }

  if (isGroupTitle(line)) {
    flushGroup();
    // Nettoie le titre : supprime annotations [IPA], tabs, espaces multiples
    const cleanTitle = line
      .replace(/\s*\[.*?\]/g, "")
      .replace(/\t/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    cur = { title: cleanTitle, words: [], summary: "" };
    continue;
  }
  if (!cur) continue;

  // En-tête de mot
  const wh = extractWordHeader(raw);
  if (wh && wh.headword.length >= 2) {
    flushWord();
    if (!wh.category) wh.category = inferCategory(wh.headword);
    curWord = { ...wh, definition: "", origin: "", synonyms: "", examples: [] };
    inExamples = false;
    defCont = false;
    continue;
  }

  if (curWord) {
    const dm = DEF_RE.exec(line) ?? SIGN_RE.exec(line);
    if (dm) {
      curWord.definition = dm[1].trim();
      defCont = true;
      inExamples = false;
      continue;
    }
    if (EX_START_RE.test(line)) {
      inExamples = true;
      defCont = false;
      const after = line.replace(EX_START_RE, "").trim();
      if (after) curWord.examples.push(after);
      continue;
    }
    const om = ORIGINE_RE.exec(line);
    if (om) {
      curWord.origin = om[1].trim();
      defCont = false;
      continue;
    }
    const sm = SYNON_RE.exec(line);
    if (sm) {
      curWord.synonyms = sm[1].trim();
      defCont = false;
      continue;
    }
    if (inExamples) {
      curWord.examples.push(line);
      continue;
    }
    if (defCont) {
      curWord.definition += " " + line;
      continue;
    }
  } else {
    cur.summary += (cur.summary ? " " : "") + line;
  }
}
flushGroup();

// ── Filtre qualité ────────────────────────────────────────────────────────────

// Déduplique par premier headword
const seenDoc = new Set<string>();
const unique = groups.filter((g) => {
  const hw = norm(g.words[0]?.headword ?? g.title.split(/\s*[&,]\s*/)[0]);
  if (seenDoc.has(hw)) return false;
  seenDoc.add(hw);
  return true;
});

// Exclut ceux déjà dans manual.ts
const existingHW = new Set<string>();
for (const g of manualGroups) for (const w of g.words) existingHW.add(norm(w.headword));

const newGroups = unique.filter((g) => {
  if (g.words.some((w) => existingHW.has(norm(w.headword)))) return false;
  if (g.words.length < 2) return false;
  if (g.words.some((w) => !w.definition.trim())) return false;
  if (g.words.some((w) => !w.category.trim())) return false;
  return true;
});

console.log(`\n📊 Groupes parsés v3     : ${unique.length}`);
console.log(`📊 Déjà dans manual.ts   : ${unique.filter((g) => g.words.some((w) => existingHW.has(norm(w.headword)))).length}`);
console.log(`📊 Nouveaux importables  : ${newGroups.length}`);
console.log("\n── Aperçu ──");
newGroups.forEach((g) => {
  console.log(`  ${g.title}`);
  g.words.forEach((w) =>
    console.log(`    • ${w.headword} (${w.category}) — ${w.translationHy.slice(0, 60)}`)
  );
});

if (!APPLY) {
  console.log("\n💡 Relancez avec --apply pour ajouter à manual.ts");
  process.exit(0);
}

// ── Génération TypeScript ─────────────────────────────────────────────────────

function esc(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ");
}

function groupTs(g: ParsedGroup): string {
  const headwords = g.words.map((w) => w.headword);
  const slug = slugify(headwords);
  const letter = norm(headwords[0])[0]?.toUpperCase() ?? "A";
  const summary = esc(g.summary || `Distinguer ${headwords.join(" et ")}.`);
  const wordsTs = g.words
    .map((w) => {
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
    })
    .join(",\n");
  return `  {\n    slug: "${slug}",\n    title: "${esc(g.title)}",\n    letter: "${letter}",\n    summary: "${summary}",\n    words: [\n${wordsTs},\n    ],\n  },`;
}

let src = readFileSync(path.join(ROOT, "scripts/source-data/manual.ts"), "utf-8");
const insertionPoint = src.lastIndexOf("];");
if (insertionPoint === -1) {
  console.error("❌ `];` introuvable dans manual.ts");
  process.exit(1);
}
const newEntries = newGroups.map(groupTs).join("\n");
src = src.slice(0, insertionPoint) + newEntries + "\n" + src.slice(insertionPoint);
writeFileSync(path.join(ROOT, "scripts/source-data/manual.ts"), src, "utf-8");
console.log(`\n✅ ${newGroups.length} groupes ajoutés → manual.ts`);
console.log("Relancez : npm run ingest && npm run db:seed");
