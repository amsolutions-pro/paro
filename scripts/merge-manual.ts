/**
 * Merge existing manual.json with new bilingual data from Paronymes alphabétiques.
 * - Enriches existing groups with Armenian translations
 * - Adds new bilingual groups
 * - Writes updated content/manual.json
 */
import { readFileSync, writeFileSync } from "fs";

const existingManual = JSON.parse(readFileSync("content/manual.json", "utf-8")) as ManualGroup[];
const enrichedGroups = JSON.parse(readFileSync("content/_extracted/enriched-groups.json", "utf-8")) as NewGroup[];
const dict = JSON.parse(readFileSync("content/_extracted/hy-dict-full.json", "utf-8")) as Record<string, DictEntry>;

interface ManualWord {
  id: string;
  headword: string;
  category: string;
  posClass: string;
  translationHy: string;
  definition: string;
  origin?: string | null;
  synonyms?: string | null;
  examples: string[];
  reviewNeeded: boolean;
}

interface ManualGroup {
  id: string;
  slug: string;
  title: string;
  letter: string;
  summary: string;
  words: ManualWord[];
}

interface NewGroup {
  slug: string;
  title: string;
  letter: string;
  summary: string;
  words: {
    headword: string;
    category: string;
    posClass: string;
    translationHy: string;
    definition: string;
    examples: string[];
    reviewNeeded: boolean;
  }[];
}

interface DictEntry {
  headword: string;
  category: string;
  translationHy: string;
  definition: string;
  examples: string[];
}

// Step 1: Enrich existing groups with Armenian translations
let enrichedCount = 0;
for (const group of existingManual) {
  for (const word of group.words) {
    if (!word.translationHy) {
      const entry = dict[word.headword.toLowerCase()];
      if (entry?.translationHy) {
        word.translationHy = entry.translationHy;
        word.reviewNeeded = false;
        enrichedCount++;
      }
    }
    // Also enrich definition if empty or very short
    if (!word.definition || word.definition.length < 5) {
      const entry = dict[word.headword.toLowerCase()];
      if (entry?.definition && entry.definition.length > 5) {
        word.definition = entry.definition;
      } else if (!word.definition) {
        word.definition = word.headword + ".";
      }
    }
  }
}

// Step 2: Find new groups not already in existing manual
const existingSlugs = new Set(existingManual.map(g => g.slug));
const existingWords = new Set(existingManual.flatMap(g => g.words.map(w => w.headword.toLowerCase())));

function inferPosClass(cat: string): string {
  if (/\bv\b/.test(cat)) return "VERBE";
  if (/\bf\b/.test(cat)) return "NOM_F";
  if (/\bm\b/.test(cat) || /\bn\b/.test(cat)) return "NOM_M";
  if (/adj/.test(cat)) return "ADJECTIF";
  return "AUTRE";
}

const newGroups: ManualGroup[] = [];
let newGroupCount = 0;

for (const ng of enrichedGroups) {
  // Skip if slug already exists
  if (existingSlugs.has(ng.slug)) continue;

  // Skip if all headwords already covered by existing groups
  const covered = ng.words.every(w => existingWords.has(w.headword.toLowerCase()));
  if (covered) continue;

  // Build group
  const id = `new-${ng.slug}`;
  const words: ManualWord[] = ng.words.map((w, idx) => ({
    id: `${id}-${idx}`,
    headword: w.headword,
    category: w.category || "—",
    posClass: inferPosClass(w.category),
    translationHy: w.translationHy || "",
    definition: w.definition || `Paronyme de ${ng.words.filter(x => x.headword !== w.headword).map(x => x.headword).join(", ")}.`,
    origin: null,
    synonyms: null,
    examples: w.examples || [],
    reviewNeeded: !w.translationHy,
  }));

  newGroups.push({
    id,
    slug: ng.slug,
    title: ng.title.replace(/\s+/g, " ").trim(),
    letter: ng.letter,
    summary: ng.summary || `Ne pas confondre ${ng.words.map(w => w.headword).join(" et ")} : ces paronymes ont des sens distincts.`,
    words,
  });
  newGroupCount++;
}

// Step 3: Merge and write
const merged = [...existingManual, ...newGroups];

// Sort by letter then title
merged.sort((a, b) => {
  if (a.letter !== b.letter) return a.letter.localeCompare(b.letter, "fr");
  return a.title.localeCompare(b.title, "fr");
});

// Recalculate pages in summary
const totalWords = merged.flatMap(g => g.words).length;
const withArmenian = merged.flatMap(g => g.words).filter(w => w.translationHy).length;

console.log(`\n=== MERGE SUMMARY ===`);
console.log(`Existing groups: ${existingManual.length}`);
console.log(`  Words enriched with Armenian: ${enrichedCount}`);
console.log(`New groups added: ${newGroupCount}`);
console.log(`Total groups: ${merged.length}`);
console.log(`Total words: ${totalWords}`);
console.log(`Words with Armenian: ${withArmenian} / ${totalWords} (${Math.round(withArmenian/totalWords*100)}%)`);

writeFileSync("content/manual.json", JSON.stringify(merged, null, 2), "utf-8");
console.log(`\nWritten to content/manual.json`);
