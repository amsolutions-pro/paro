/**
 * Extract word → Armenian translation dictionary from Paronymes alphabétiques.
 * Also extract definitions for new groups.
 */
import { readFileSync, writeFileSync } from "fs";

const raw = readFileSync("content/_extracted/Paronymes alphabétiques.docx.txt", "utf-8");
const lines = raw.split("\n").map(l => l.trim());

interface WordEntry {
  headword: string;
  category: string;
  translationHy: string;
  definition: string;
  examples: string[];
}

const dictionary: Record<string, WordEntry> = {};

function containsArmenian(s: string): boolean {
  return /[Ա-֊]/.test(s);
}

// Pattern: word + category + Armenian (tab or 2+ spaces separator)
// e.g. "Absorber v.tr.\tկlanel, nertsitsel"
// e.g. "Accès m. :\t\tmutk, motenaлou hnaravorut'yun..."

const wordLineRe = /^([A-ZÀ-Öa-zà-öœ'()éèêëàâùûüïîôœæç\-]+(?:\s+[a-zà-öœéèêëàâùûüïîôœæç()\-]+)?)\s+((?:(?:m|f|n|adj|v|adv|prép|conj|interj)(?:\.(?:tr|intr|pron|f|m|pl)?\.?)?(?:\s+:)?(?:\s*(?:m|f|adj|v|adv)\.)?))[\s\t]{2,}(.+)$/;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line || line.length < 5) continue;

  // Match word entry with Armenian
  const m = line.match(wordLineRe);
  if (m) {
    const headword = m[1].trim().toLowerCase();
    const category = m[2].trim();
    const rest = m[3].trim();
    if (containsArmenian(rest)) {
      // Collect definition from subsequent lines
      let definition = "";
      let examples: string[] = [];
      let j = i + 1;
      let inDef = false;
      let inEx = false;
      while (j < lines.length && j < i + 20) {
        const l = lines[j];
        if (!l) { j++; if (inDef) break; continue; }
        if (l.startsWith("Définition") || l.startsWith("Signification")) {
          inDef = true; inEx = false;
          const d = l.replace(/^(Définition|Signification)\s*:\s*/, "").trim();
          if (d) definition = d;
          j++; continue;
        }
        if (l.startsWith("Exemples") || l.startsWith("Exemple")) {
          inDef = false; inEx = true; j++; continue;
        }
        if (l.startsWith("Origine") || l.startsWith("Synonymes") || l.startsWith("Bien que")) {
          break;
        }
        if (inDef && l.length > 5) definition += " " + l;
        if (inEx && l.length > 10 && l.length < 200) examples.push(l);
        j++;
      }
      // Capitalize headword for display
      const display = m[1].trim();
      dictionary[headword] = {
        headword: display,
        category,
        translationHy: rest,
        definition: definition.trim().replace(/\s+/g, " "),
        examples: examples.filter(e => e.length > 5).slice(0, 3),
      };
    }
  }
}

const entries = Object.values(dictionary);
console.log(`Extracted ${entries.length} word entries with Armenian translations`);

// Show sample
entries.slice(0, 30).forEach(e => {
  console.log(`  ${e.headword} (${e.category}): ${e.translationHy.slice(0, 40)}...`);
});

writeFileSync(
  "content/_extracted/hy-dictionary.json",
  JSON.stringify(dictionary, null, 2),
  "utf-8"
);
console.log("\nWritten to content/_extracted/hy-dictionary.json");
