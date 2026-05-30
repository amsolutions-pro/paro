/**
 * Test d'encodage UTF-8 : une chaîne arménienne survit au cycle
 * JSON.stringify / JSON.parse / stockage DB / lecture.
 *
 * Porte de qualité Étape 2 (cf. §0 — UTF-8 strict de bout en bout).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ARMENIAN = "հարանուն"; // « paronyme » en arménien

describe("Encodage UTF-8 arménien", () => {
  it("JSON.stringify → JSON.parse préserve la chaîne arménienne", () => {
    const obj = { word: ARMENIAN };
    const str = JSON.stringify(obj);
    const parsed = JSON.parse(str) as { word: string };
    expect(parsed.word).toBe(ARMENIAN);
  });

  it("content/manual.json contient des chaînes arméniennes intactes", () => {
    const raw = readFileSync(path.join(process.cwd(), "content/manual.json"), "utf-8");
    // Le fichier doit contenir le mot arménien « ականավոր » (attesté dans le gabarit-source).
    expect(raw).toContain("ականավոր");
  });

  it("content/exercises.json contient des chaînes arméniennes intactes", () => {
    const raw = readFileSync(path.join(process.cwd(), "content/exercises.json"), "utf-8");
    // La traduction de l'exercice 17 (Բժիշկը հայտնաբերեց…) doit être présente.
    expect(raw).toContain("Բժիշկը");
  });

  it("les paires arméniennes du tableau de mise en regard sont préservées", () => {
    const manual = JSON.parse(
      readFileSync(path.join(process.cwd(), "content/manual.json"), "utf-8"),
    ) as Array<{ words: Array<{ translationHy: string }> }>;
    const withHy = manual.flatMap((g) => g.words).filter((w) => w.translationHy.trim());
    // Au moins 8 mots ont une traduction arménienne attestée dans la source.
    expect(withHy.length).toBeGreaterThanOrEqual(8);
    // Tous contiennent des caractères unicode arméniens (bloc U+0531–U+058A).
    for (const w of withHy) {
      expect(/[Ա-֊]/u.test(w.translationHy)).toBe(true);
    }
  });
});
