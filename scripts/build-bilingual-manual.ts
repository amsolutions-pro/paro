/**
 * Build bilingual manual data by:
 * 1. Extracting word→Armenian from Paronymes alphabétiques.docx.txt
 * 2. Extracting pair groups and definitions
 * 3. Outputting enriched ManualGroupContent[] for manual.ts
 *
 * Run: npx tsx scripts/build-bilingual-manual.ts
 */
import { readFileSync, writeFileSync } from "fs";

const raw = readFileSync("content/_extracted/Paronymes alphabétiques.docx.txt", "utf-8");
const lines = raw.split("\n");

function trim(s: string) { return s.replace(/^\s+|\s+$/g, ""); }
function hasArmenian(s: string) { return /[Ա-֊ա-֊]/.test(s); }

// ── Step 1: Extract word→Armenian dictionary ──────────────────────────────────
// Each entry line: "Word [category]\tArmenian..."  (tab-separated)
// category is optional (some words have no explicit category on entry line)

interface DictEntry {
  headword: string;
  category: string;
  translationHy: string;
  definition: string;
  examples: string[];
}

const dict: Record<string, DictEntry> = {}; // keyed by lowercase headword

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.includes("\t")) continue;

  const parts = line.split("\t");
  // We need at least one part before the tab and one after with Armenian
  const before = trim(parts[0]);
  // Find the last tab segment that has Armenian
  const afterParts = parts.slice(1).map(trim);
  const armenianPart = afterParts.find(p => hasArmenian(p));
  if (!armenianPart) continue;

  // "before" should be "Word" or "Word category" or "Word (ve) category"
  // Must start with a capital letter or accented capital
  if (!/^[A-ZÀ-Öa-zà-öœéèêëàâùûîôœÂÉÈÊËÀÙÛÎÔŒÆ']/.test(before)) continue;
  // Must not be too long (not a sentence)
  if (before.length > 50) continue;
  // Skip known non-headword lines
  if (before.startsWith("Définition") || before.startsWith("Synonymes") ||
    before.startsWith("Exemples") || before.startsWith("Origine") ||
    before.startsWith("Bien que") || before.startsWith("Note")) continue;

  // Parse headword and category from "before"
  // Patterns: "Absorber v.tr.", "Accès m. :", "Effectif (ve) adj.", "Affermir"
  const catMatch = before.match(/^([\wÀ-Öà-öœéèêëàâùûîôœ'\s()\-]+?)\s+((?:(?:m|f|n|adj|v|adv|prép|conj|interj|art)(?:\.(?:tr|intr|pron|f|m|pl)?\.?)?(?:\s*:)?\s*)+)$/);
  let headword: string;
  let category: string;
  if (catMatch) {
    headword = trim(catMatch[1]);
    category = trim(catMatch[2]);
  } else {
    headword = trim(before);
    category = "";
  }

  // Skip if headword looks like a sentence or has numbers
  if (/\d/.test(headword) || headword.includes(".") || headword.length < 2) continue;

  // Collect definition from following lines
  let definition = "";
  const examples: string[] = [];
  let inDef = false;
  let inEx = false;
  for (let j = i + 1; j < Math.min(i + 25, lines.length); j++) {
    const l = trim(lines[j]);
    if (!l) { if (inDef && definition) break; continue; }
    if (l.startsWith("Définition") || l.startsWith("Signification")) {
      inDef = true; inEx = false;
      const d = l.replace(/^(Définition|Signification)\s*:\s*/, "").trim();
      if (d && !hasArmenian(d)) definition = d;
      continue;
    }
    if (l.startsWith("Exemples") || l.startsWith("Exemple")) { inDef = false; inEx = true; continue; }
    if (l.startsWith("Origine") || l.startsWith("Synonymes") || l.startsWith("Bien que") ||
      l.startsWith("Note ") || l.startsWith("Comprendre")) break;
    if (inDef && l.length > 10 && l.length < 300 && !hasArmenian(l)) {
      definition += " " + l;
    }
    if (inEx && l.length > 10 && l.length < 200 && !l.startsWith("Exemple") && !hasArmenian(l)) {
      examples.push(l);
    }
  }

  const key = headword.toLowerCase();
  if (!dict[key]) {
    dict[key] = {
      headword,
      category,
      translationHy: armenianPart,
      definition: trim(definition).replace(/\s+/g, " "),
      examples: examples.slice(0, 3),
    };
  }
}

// ── Step 2: Extract group structure (pairs) ───────────────────────────────────
// Group header: "Word1 & Word2" or "Word1, Word2 & Word3" on its own line

interface GroupDef {
  title: string;
  headwords: string[];
  summary: string;
}

const groupDefs: GroupDef[] = [];

for (let i = 0; i < lines.length; i++) {
  const line = trim(lines[i]);
  // Group header: contains & and only word chars + separators
  if (!line.includes("&") && !line.includes(",")) continue;
  if (line.length > 80 || line.length < 5) continue;
  if (!/^[A-ZÀ-ÖÂÉÈÊËÀÙÛÎÔŒÆa-zà-öœéèêëâùûîôœæ]/.test(line)) continue;
  // Must be a clean "Word1 & Word2" title (no punctuation except & and ,)
  if (/[.!?;:()[\]{}]/.test(line) && !line.includes("(ve)") && !line.includes("(ue)")) continue;
  // Must have at least 2 "words" separated by & or ,
  const parts = line.split(/\s*[&,]\s*/).map(trim).filter(Boolean);
  if (parts.length < 2) continue;
  // Each part should be a capitalized word or short phrase
  if (!parts.every(p => /^[A-ZÀ-Öa-zà-öœéèêëâùûîôœæ']/.test(p) && p.length < 40)) continue;

  // Collect summary (the comparison paragraph at the end of the group)
  let summary = "";
  for (let j = i + 1; j < Math.min(i + 60, lines.length); j++) {
    const l = trim(lines[j]);
    if (!l) continue;
    // Next group header — stop
    if (l.includes("&") && l.length < 80 && /^[A-Z]/.test(l)) break;
    // Summary is the "Bien que..." paragraph
    if (l.startsWith("Bien que") || l.startsWith("Il est important") ||
      l.startsWith("Ces deux") || l.startsWith("Bien qu'")) {
      summary = l;
      break;
    }
  }

  groupDefs.push({ title: line, headwords: parts, summary });
}

// ── Step 3: Build output ──────────────────────────────────────────────────────

const enrichedGroups = groupDefs
  .filter(g => {
    // Only include groups where we have at least 2 words in the dictionary
    const found = g.headwords.filter(hw => dict[hw.toLowerCase()]);
    return found.length >= 2;
  })
  .map(g => {
    const letter = g.headwords[0].replace(/[^A-Za-zÀ-Öà-öœ]/, "")[0].toUpperCase();
    const slug = g.headwords
      .map(w => w.toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z]/g, "")
      )
      .join("-");

    const words = g.headwords.map(hw => {
      const entry = dict[hw.toLowerCase()];
      return {
        headword: hw,
        category: entry?.category || "",
        posClass: inferPosClass(entry?.category || ""),
        translationHy: entry?.translationHy || "",
        definition: entry?.definition || "",
        origin: "",
        synonyms: "",
        examples: entry?.examples || [],
        reviewNeeded: !entry?.translationHy,
      };
    });

    return { slug, title: g.title, letter, summary: g.summary, words };
  });

function inferPosClass(cat: string): string {
  if (/\bv\b/.test(cat)) return "VERBE";
  if (/\bf\b/.test(cat) || /\bm\b/.test(cat) || /\bn\b/.test(cat)) return "NOM";
  if (/adj/.test(cat)) return "ADJECTIF";
  return "AUTRE";
}

console.log(`Dictionary: ${Object.keys(dict).length} words`);
console.log(`Groups found: ${groupDefs.length}, with 2+ known words: ${enrichedGroups.length}`);
console.log("\nSample groups:");
enrichedGroups.slice(0, 20).forEach(g => {
  console.log(`  ${g.title}: ${g.words.map(w => `${w.headword}[${w.translationHy.slice(0,15)}]`).join(", ")}`);
});

writeFileSync(
  "content/_extracted/enriched-groups.json",
  JSON.stringify(enrichedGroups, null, 2),
  "utf-8"
);
writeFileSync(
  "content/_extracted/hy-dict-full.json",
  JSON.stringify(dict, null, 2),
  "utf-8"
);
console.log(`\nWritten to content/_extracted/enriched-groups.json`);
console.log(`Written to content/_extracted/hy-dict-full.json`);
