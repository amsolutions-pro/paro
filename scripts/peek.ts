import mammoth from "mammoth";
import { writeFileSync } from "fs";

const files = [
  "content/Paronymes_manuel_fr-hy.docx",
  "content/Paronymes alphabétiques.docx",
  "content/Quiz alphabétique paronyme.docx",
];

async function main() {
  for (const f of files) {
    const r = await mammoth.extractRawText({ path: f });
    writeFileSync(`content/_extracted/${f.split("/").pop()}.txt`, r.value, "utf-8");
    console.log(`\n${"=".repeat(60)}\n${f}\n${"=".repeat(60)}`);
    console.log(r.value.slice(0, 4000));
  }
}

main();
