import { describe, it, expect } from "vitest";
import {
  addSample,
  computeDelayFromSamples,
  MAX_SAMPLES,
  MIN_SAMPLES_TO_ADAPT,
} from "@/src/lib/advance-timing";

// ── addSample ─────────────────────────────────────────────────────────────────

describe("addSample", () => {
  it("ajoute un échantillon à un buffer vide", () => {
    expect(addSample([], 500)).toEqual([500]);
  });

  it("ajoute à la fin du buffer", () => {
    expect(addSample([100, 200], 300)).toEqual([100, 200, 300]);
  });

  it("tronque au-delà de MAX_SAMPLES (garde les plus récents)", () => {
    const full = Array.from({ length: MAX_SAMPLES }, (_, i) => i * 100); // [0, 100, ..., 1900]
    const result = addSample(full, 9999);
    expect(result).toHaveLength(MAX_SAMPLES);
    expect(result[result.length - 1]).toBe(9999); // dernier = le nouveau
    expect(result[0]).toBe(100);                  // premier de l'ancien buffer droppé
  });

  it("ne modifie pas le tableau d'entrée (immutable)", () => {
    const original = [100, 200];
    addSample(original, 300);
    expect(original).toEqual([100, 200]);
  });
});

// ── computeDelayFromSamples ───────────────────────────────────────────────────

describe("computeDelayFromSamples", () => {
  // Cas : pas assez d'échantillons
  it("retourne 3 s si buffer vide", () => {
    expect(computeDelayFromSamples([])).toBe(3);
  });

  it(`retourne 3 s si moins de ${MIN_SAMPLES_TO_ADAPT} échantillons`, () => {
    expect(computeDelayFromSamples([500])).toBe(3);
    expect(computeDelayFromSamples([500, 600])).toBe(3);
  });

  // Cas : clics très rapides → délai 1 s
  it("retourne 1 s si moyenne < 1500 ms (clics à ~0,5 s)", () => {
    // avg = 500 ms
    const samples = [400, 500, 600];
    expect(computeDelayFromSamples(samples)).toBe(1);
  });

  it("retourne 1 s si moyenne = 1000 ms (clics à ~1 s)", () => {
    const samples = [900, 1000, 1100];
    expect(computeDelayFromSamples(samples)).toBe(1);
  });

  it("retourne 1 s si moyenne exactement = 1499 ms", () => {
    const samples = [1499, 1499, 1499];
    expect(computeDelayFromSamples(samples)).toBe(1);
  });

  // Cas : clics moyens → délai 2 s
  it("retourne 2 s si moyenne = 1500 ms (frontière exacte)", () => {
    // 1500 n'est PAS < 1500, donc passe au seuil suivant
    const samples = [1500, 1500, 1500];
    expect(computeDelayFromSamples(samples)).toBe(2);
  });

  it("retourne 2 s si moyenne ≈ 2 s (clics à ~2 s)", () => {
    const samples = [1800, 2000, 2200];
    expect(computeDelayFromSamples(samples)).toBe(2);
  });

  it("retourne 2 s si moyenne = 2499 ms (frontière basse du 3 s)", () => {
    const samples = [2499, 2499, 2499];
    expect(computeDelayFromSamples(samples)).toBe(2);
  });

  // Cas : clics lents → délai 3 s
  it("retourne 3 s si moyenne = 2500 ms (frontière exacte)", () => {
    const samples = [2500, 2500, 2500];
    expect(computeDelayFromSamples(samples)).toBe(3);
  });

  it("retourne 3 s si moyenne > 2500 ms (attente longue)", () => {
    const samples = [3000, 3500, 4000]; // avg = 3500 ms
    expect(computeDelayFromSamples(samples)).toBe(3);
  });

  // Cas : buffer de 20 échantillons mélangés
  it("calcule correctement avec 20 échantillons rapides", () => {
    const samples = Array.from({ length: 20 }, () => 800); // avg = 800 ms
    expect(computeDelayFromSamples(samples)).toBe(1);
  });

  it("moyenne pondère correctement quand les valeurs varient", () => {
    // avg = (500 + 500 + 2500) / 3 = 1166 ms → < 1500 → 1 s
    const samples = [500, 500, 2500];
    expect(computeDelayFromSamples(samples)).toBe(1);
  });

  it("exactement MIN_SAMPLES_TO_ADAPT échantillons déclenche l'adaptation", () => {
    const samples = Array.from({ length: MIN_SAMPLES_TO_ADAPT }, () => 600);
    expect(computeDelayFromSamples(samples)).toBe(1); // avg 600 ms < 1500 ms
  });
});
