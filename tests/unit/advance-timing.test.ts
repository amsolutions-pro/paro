import { describe, it, expect } from "vitest";
import {
  addSample,
  computeDelayFromSamples,
  computeIncorrectDelayFromSamples,
  MAX_SAMPLES,
  CORRECT_MAX_SAMPLES,
  INCORRECT_MAX_SAMPLES,
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

  it("tronque au-delà de CORRECT_MAX_SAMPLES (défaut)", () => {
    const full = Array.from({ length: CORRECT_MAX_SAMPLES }, (_, i) => i * 100);
    const result = addSample(full, 9999);
    expect(result).toHaveLength(CORRECT_MAX_SAMPLES);
    expect(result[result.length - 1]).toBe(9999);
    expect(result[0]).toBe(100);
  });

  it("tronque au-delà de INCORRECT_MAX_SAMPLES quand spécifié", () => {
    const full = Array.from({ length: INCORRECT_MAX_SAMPLES }, (_, i) => i * 100);
    const result = addSample(full, 9999, INCORRECT_MAX_SAMPLES);
    expect(result).toHaveLength(INCORRECT_MAX_SAMPLES);
    expect(result[result.length - 1]).toBe(9999);
    expect(result[0]).toBe(100);
  });

  it("ne modifie pas le tableau d'entrée (immutable)", () => {
    const original = [100, 200];
    addSample(original, 300);
    expect(original).toEqual([100, 200]);
  });

  it("MAX_SAMPLES est un alias de CORRECT_MAX_SAMPLES", () => {
    expect(MAX_SAMPLES).toBe(CORRECT_MAX_SAMPLES);
  });
});

// ── computeDelayFromSamples (bonnes réponses, défaut 3 s) ────────────────────

describe("computeDelayFromSamples", () => {
  it("retourne 3 s si buffer vide", () => {
    expect(computeDelayFromSamples([])).toBe(3);
  });

  it(`retourne 3 s si moins de ${MIN_SAMPLES_TO_ADAPT} échantillons`, () => {
    expect(computeDelayFromSamples([500])).toBe(3);
    expect(computeDelayFromSamples([500, 600])).toBe(3);
  });

  it("retourne 1 s si moyenne < 1500 ms (clics à ~0,5 s)", () => {
    expect(computeDelayFromSamples([400, 500, 600])).toBe(1);
  });

  it("retourne 1 s si moyenne = 1000 ms", () => {
    expect(computeDelayFromSamples([900, 1000, 1100])).toBe(1);
  });

  it("retourne 1 s si moyenne = 1499 ms (frontière haute du 1 s)", () => {
    expect(computeDelayFromSamples([1499, 1499, 1499])).toBe(1);
  });

  it("retourne 2 s si moyenne = 1500 ms (frontière basse du 2 s)", () => {
    expect(computeDelayFromSamples([1500, 1500, 1500])).toBe(2);
  });

  it("retourne 2 s si moyenne ≈ 2 s", () => {
    expect(computeDelayFromSamples([1800, 2000, 2200])).toBe(2);
  });

  it("retourne 2 s si moyenne = 2499 ms (frontière haute du 2 s)", () => {
    expect(computeDelayFromSamples([2499, 2499, 2499])).toBe(2);
  });

  it("retourne 3 s si moyenne = 2500 ms (frontière basse du 3 s)", () => {
    expect(computeDelayFromSamples([2500, 2500, 2500])).toBe(3);
  });

  it("retourne 3 s si moyenne > 2500 ms", () => {
    expect(computeDelayFromSamples([3000, 3500, 4000])).toBe(3);
  });

  it("se déclenche exactement à MIN_SAMPLES_TO_ADAPT échantillons", () => {
    const samples = Array.from({ length: MIN_SAMPLES_TO_ADAPT }, () => 600);
    expect(computeDelayFromSamples(samples)).toBe(1);
  });
});

// ── computeIncorrectDelayFromSamples (mauvaises réponses, défaut 6 s) ─────────

describe("computeIncorrectDelayFromSamples", () => {
  it("retourne 6 s si buffer vide", () => {
    expect(computeIncorrectDelayFromSamples([])).toBe(6);
  });

  it(`retourne 6 s si moins de ${MIN_SAMPLES_TO_ADAPT} échantillons`, () => {
    expect(computeIncorrectDelayFromSamples([1000])).toBe(6);
    expect(computeIncorrectDelayFromSamples([1000, 1500])).toBe(6);
  });

  it("retourne 2 s si moyenne < 2000 ms (lecture très rapide)", () => {
    expect(computeIncorrectDelayFromSamples([1000, 1500, 1800])).toBe(2);
  });

  it("retourne 2 s si moyenne = 1999 ms (frontière haute du 2 s)", () => {
    expect(computeIncorrectDelayFromSamples([1999, 1999, 1999])).toBe(2);
  });

  it("retourne 4 s si moyenne = 2000 ms (frontière basse du 4 s)", () => {
    expect(computeIncorrectDelayFromSamples([2000, 2000, 2000])).toBe(4);
  });

  it("retourne 4 s si moyenne ≈ 3 s", () => {
    expect(computeIncorrectDelayFromSamples([2500, 3000, 3500])).toBe(4);
  });

  it("retourne 4 s si moyenne = 3999 ms (frontière haute du 4 s)", () => {
    expect(computeIncorrectDelayFromSamples([3999, 3999, 3999])).toBe(4);
  });

  it("retourne 6 s si moyenne = 4000 ms (frontière basse du 6 s)", () => {
    expect(computeIncorrectDelayFromSamples([4000, 4000, 4000])).toBe(6);
  });

  it("retourne 6 s si moyenne > 4000 ms (lecture lente)", () => {
    expect(computeIncorrectDelayFromSamples([5000, 6000, 7000])).toBe(6);
  });

  it("se déclenche exactement à MIN_SAMPLES_TO_ADAPT échantillons", () => {
    const samples = Array.from({ length: MIN_SAMPLES_TO_ADAPT }, () => 1500);
    expect(computeIncorrectDelayFromSamples(samples)).toBe(2);
  });

  it("calcule correctement sur 10 échantillons (INCORRECT_MAX_SAMPLES)", () => {
    const samples = Array.from({ length: 10 }, () => 1000); // avg 1s → 2s
    expect(computeIncorrectDelayFromSamples(samples)).toBe(2);
  });
});
