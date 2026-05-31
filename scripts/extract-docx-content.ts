/**
 * Extrait les définitions et "Le bon usage" du DOCX extrait (manuel.txt)
 * et génère un JSON de correspondances headword → {definition, bonUsage}.
 *
 * Usage : npx tsx scripts/extract-docx-content.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TEXT = readFileSync(path.join(ROOT, "content/_extracted/manuel.txt"), "utf-8");
const lines = TEXT.split("\n");

interface WordEntry {
  headword: string;
  definition: string;
}

interface GroupEntry {
  headwords: string[];
  definitions: Record<string, string>;  // headword → definition
  bonUsage: string;
}

const groups: GroupEntry[] = [];
let currentGroup: GroupEntry | null = null;
let currentHeadword: string | null = null;

// Regex patterns
const WORD_HEADER = /^([A-ZÀ-Ÿa-zà-ÿ''\-]+)\s{2,}(adj\.|v\. tr\.|v\. intr\.|v\. pron\.|v\. tr\. ind\.|v\. impers\.|n\. m\.|n\. f\.)[^—]*—/;
const DEFINITION_LINE = /^Définition\s+(.+)/;
const BON_USAGE_LINE = /^Le bon usage\s+(.+)/;
// Group title: "Word1 & Word2" or "Word1, Word2 et Word3"
const GROUP_TITLE = /^([A-ZÀ-Ÿ][A-Za-zÀ-ÿ'\-]+(?:,\s[A-Za-zÀ-ÿ'\-]+)*(?:\s(?:&|et)\s[A-Za-zÀ-ÿ'\-]+)+)\s*$/;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // Detect group title
  const groupMatch = GROUP_TITLE.exec(line);
  if (groupMatch) {
    if (currentGroup) groups.push(currentGroup);
    currentGroup = { headwords: [], definitions: {}, bonUsage: "" };
    currentHeadword = null;
    continue;
  }

  if (!currentGroup) continue;

  // Detect word header: "Absorber  v. tr.  —  ..."
  const wordMatch = WORD_HEADER.exec(line);
  if (wordMatch) {
    // Extract headword (first token before the spaces)
    const hw = line.split(/\s{2,}/)[0].trim().toLowerCase();
    if (!currentGroup.headwords.includes(hw)) {
      currentGroup.headwords.push(hw);
    }
    currentHeadword = hw;
    continue;
  }

  // Detect definition
  const defMatch = DEFINITION_LINE.exec(line);
  if (defMatch && currentHeadword) {
    currentGroup.definitions[currentHeadword] = defMatch[1].trim();
    continue;
  }

  // Detect "Le bon usage"
  const bonMatch = BON_USAGE_LINE.exec(line);
  if (bonMatch) {
    currentGroup.bonUsage = bonMatch[1].trim();
    currentHeadword = null;
    continue;
  }
}
if (currentGroup) groups.push(currentGroup);

// Remove empty groups
const valid = groups.filter(g => g.headwords.length > 0 && Object.keys(g.definitions).length > 0);

console.log(`✅ ${valid.length} groupes extraits`);

// Show a sample
valid.slice(0, 3).forEach(g => {
  console.log(`\n── ${g.headwords.join(" & ")} ──`);
  g.headwords.forEach(hw => {
    console.log(`  ${hw}: "${(g.definitions[hw] ?? "—").slice(0, 80)}…"`);
  });
  console.log(`  bonUsage: "${g.bonUsage.slice(0, 80)}…"`);
});

writeFileSync(
  path.join(ROOT, "content/docx-extracted-content.json"),
  JSON.stringify(valid, null, 2) + "\n",
  "utf-8"
);
console.log("\n📄 → content/docx-extracted-content.json");
