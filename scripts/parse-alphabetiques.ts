/**
 * Parse Paronymes alphabétiques.docx.txt and extract bilingual entries.
 * Outputs a JSON file with parsed groups ready for integration.
 */
import { readFileSync, writeFileSync } from "fs";

const raw = readFileSync("content/_extracted/Paronymes alphabétiques.docx.txt", "utf-8");
const lines = raw.split("\n").map(l => l.trim());

interface ParsedWord {
  headword: string;
  category: string;
  translationHy: string;
  definition: string;
  examples: string[];
}

interface ParsedGroup {
  title: string;
  words: ParsedWord[];
}

const groups: ParsedGroup[] = [];
let i = 0;

// Detect group headers: lines like "Word1 & Word2" or "Word1, Word2 & Word3"
function isGroupHeader(line: string): boolean {
  if (!line || line.length < 3 || line.length > 80) return false;
  if (!/[A-ZÀ-Ö]/.test(line[0]) && !/^[A-ZÀ-Ö]/.test(line)) return false;
  // Must contain & or , connecting capitalized words
  return /^[A-ZÀ-Öa-zà-öœ]+[,\s]+[A-ZÀ-Öa-zà-öœ]+(\s*[,&]\s*[A-ZÀ-Öa-zà-öœ]+)*$/.test(line) &&
    (line.includes("&") || (line.includes(",") && line.split(",").length >= 2));
}

// Detect word entry line: "Word m./f./adj./v. ARMENIAN_TEXT"
function parseWordEntry(line: string): { headword: string; category: string; translationHy: string } | null {
  // Pattern: "Word(s) cat. armenian" where cat is like m., f., adj., v.tr., etc.
  const m = line.match(/^([A-ZÀ-Öa-zà-öœ'()\-]+(?:\s+[A-ZÀ-Öa-zà-öœ'()\-]+)?)\s+((?:m\.|f\.|adj\.|v\.(?:tr\.|intr\.|pron\.)?|n\.|adv\.|prép\.)[^\t]*?)\s{2,}(.+)$/);
  if (m) {
    return { headword: m[1].trim(), category: m[2].trim(), translationHy: m[3].trim() };
  }
  // Looser match: word followed by tab and Armenian
  const m2 = line.match(/^([A-ZÀ-Öa-zà-öœ'()\-]+(?:\s+[A-ZÀ-Öa-zà-öœ'()\-]+)?)\t+((?:m\.|f\.|adj\.|v\.)[^\t]*?)\t+(.+)$/);
  if (m2) {
    return { headword: m2[1].trim(), category: m2[2].trim(), translationHy: m2[3].trim() };
  }
  return null;
}

function containsArmenian(s: string): boolean {
  return /[Ա-֊]/.test(s);
}

// Main parsing loop
while (i < lines.length) {
  const line = lines[i];

  if (isGroupHeader(line)) {
    const title = line;
    const words: ParsedWord[] = [];
    i++;

    // Collect word entries until next group header or end
    let currentWord: ParsedWord | null = null;
    let inDef = false;
    let inExamples = false;

    while (i < lines.length) {
      const l = lines[i];

      // Stop if we hit next group header (after finding at least 1 word)
      if (words.length > 0 && isGroupHeader(l)) break;

      // Try to parse a word entry line with Armenian
      const entry = parseWordEntry(l);
      if (entry && containsArmenian(entry.translationHy)) {
        if (currentWord) words.push(currentWord);
        currentWord = { ...entry, definition: "", examples: [] };
        inDef = false;
        inExamples = false;
        i++;
        continue;
      }

      // Definition marker
      if (l.startsWith("Définition") || l.startsWith("Signification")) {
        inDef = true;
        inExamples = false;
        const defText = l.replace(/^(Définition|Signification)\s*:\s*/, "").trim();
        if (currentWord && defText) currentWord.definition += " " + defText;
        i++;
        continue;
      }

      // Example marker
      if (l.startsWith("Exemples") || l.startsWith("Exemple")) {
        inDef = false;
        inExamples = true;
        i++;
        continue;
      }

      // Collect definition text
      if (inDef && l && currentWord && !l.startsWith("Origine") && !l.startsWith("Synonymes")) {
        currentWord.definition += " " + l;
      }

      // Collect examples
      if (inExamples && l && currentWord && l.length > 10 && !l.startsWith("Bien que") && !l.startsWith("Pour")) {
        currentWord.examples.push(l);
      }

      // Stop collecting definition on empty line after content
      if (!l) { inExamples = false; }

      i++;
    }

    if (currentWord) words.push(currentWord);

    // Clean up
    for (const w of words) {
      w.definition = w.definition.trim().replace(/\s+/g, " ");
      w.examples = w.examples.filter(e => e.length > 5 && e.length < 200).slice(0, 3);
    }

    if (words.length >= 2) {
      groups.push({ title, words });
    }
  } else {
    i++;
  }
}

console.log(`Parsed ${groups.length} groups`);
for (const g of groups.slice(0, 10)) {
  console.log(`  ${g.title}: ${g.words.map(w => `${w.headword} [${w.translationHy.slice(0,20)}]`).join(", ")}`);
}

writeFileSync("content/_extracted/parsed-groups.json", JSON.stringify(groups, null, 2), "utf-8");
console.log(`\nWritten to content/_extracted/parsed-groups.json`);
