import { describe, it, expect } from "vitest";
import {
  addSample,
  padWithDefault,
  computeDelayFromSamples,
  computeIncorrectDelayFromSamples,
  CORRECT_MAX_SAMPLES,
  INCORRECT_MAX_SAMPLES,
  MAX_SAMPLES,
} from "@/src/lib/advance-timing";

// ── addSample ─────────────────────────────────────────────────────────────────

describe("addSample", () => {
  it("ajoute à un buffer vide", () => {
    expect(addSample([], 500)).toEqual([500]);
  });

  it("ajoute en queue", () => {
    expect(addSample([100, 200], 300)).toEqual([100, 200, 300]);
  });

  it("tronque au-delà de CORRECT_MAX_SAMPLES (défaut)", () => {
    const full = Array.from({ length: CORRECT_MAX_SAMPLES }, (_, i) => i * 100);
    const result = addSample(full, 9999);
    expect(result).toHaveLength(CORRECT_MAX_SAMPLES);
    expect(result.at(-1)).toBe(9999);
    expect(result[0]).toBe(100); // premier droppé
  });

  it("tronque au-delà de INCORRECT_MAX_SAMPLES quand spécifié", () => {
    const full = Array.from({ length: INCORRECT_MAX_SAMPLES }, (_, i) => i * 100);
    const result = addSample(full, 9999, INCORRECT_MAX_SAMPLES);
    expect(result).toHaveLength(INCORRECT_MAX_SAMPLES);
    expect(result.at(-1)).toBe(9999);
  });

  it("est immutable", () => {
    const original = [100, 200];
    addSample(original, 300);
    expect(original).toEqual([100, 200]);
  });

  it("MAX_SAMPLES est un alias de CORRECT_MAX_SAMPLES", () => {
    expect(MAX_SAMPLES).toBe(CORRECT_MAX_SAMPLES);
  });
});

// ── padWithDefault ────────────────────────────────────────────────────────────

describe("padWithDefault", () => {
  it("buffer vide → rempli entièrement avec la valeur par défaut", () => {
    const result = padWithDefault([], 5, 3000);
    expect(result).toEqual([3000, 3000, 3000, 3000, 3000]);
  });

  it("buffer partiel → complété à gauche", () => {
    const result = padWithDefault([900, 800], 5, 3000);
    expect(result).toEqual([3000, 3000, 3000, 900, 800]);
  });

  it("buffer plein → inchangé", () => {
    const full = [900, 800, 700, 600, 500];
    expect(padWithDefault(full, 5, 3000)).toEqual(full);
  });
});

// ── computeDelayFromSamples (bonnes réponses) — séquence utilisateur ──────────

describe("computeDelayFromSamples — séquence de clics rapides", () => {
  it("état initial (buffer vide → 5×3000 ms) → 3 s", () => {
    expect(computeDelayFromSamples([])).toBe(3);
  });

  it("après 1 clic rapide : [3000,3000,3000,3000,900] avg=2580 ms → 3 s", () => {
    expect(computeDelayFromSamples([900])).toBe(3);
  });

  it("après 2 clics rapides : [3000,3000,3000,900,800] avg=2140 ms → 2 s", () => {
    expect(computeDelayFromSamples([900, 800])).toBe(2);
  });

  it("après 3 clics rapides : [3000,3000,900,800,800] avg=1700 ms → 2 s", () => {
    expect(computeDelayFromSamples([900, 800, 800])).toBe(2);
  });

  it("après 4 clics rapides : [3000,900,800,800,100] avg=1120 ms → 1 s", () => {
    expect(computeDelayFromSamples([900, 800, 800, 100])).toBe(1);
  });

  it("après 5 clics rapides : buffer plein → 1 s", () => {
    expect(computeDelayFromSamples([900, 800, 800, 100, 200])).toBe(1);
  });
});

describe("computeDelayFromSamples — frontières", () => {
  it("avg = 1499 ms → 1 s", () => {
    expect(computeDelayFromSamples([1499, 1499, 1499, 1499, 1499])).toBe(1);
  });

  it("avg = 1500 ms → 2 s (frontière exclusive)", () => {
    expect(computeDelayFromSamples([1500, 1500, 1500, 1500, 1500])).toBe(2);
  });

  it("avg = 2499 ms → 2 s", () => {
    expect(computeDelayFromSamples([2499, 2499, 2499, 2499, 2499])).toBe(2);
  });

  it("avg = 2500 ms → 3 s (frontière exclusive)", () => {
    expect(computeDelayFromSamples([2500, 2500, 2500, 2500, 2500])).toBe(3);
  });
});

// ── computeIncorrectDelayFromSamples (mauvaises réponses) ─────────────────────

describe("computeIncorrectDelayFromSamples — état initial", () => {
  it("buffer vide → 10×6000 ms → 6 s", () => {
    expect(computeIncorrectDelayFromSamples([])).toBe(6);
  });

  it("après 1 clic rapide (1500 ms) avg=(9×6000+1500)/10=5550 ms → 6 s", () => {
    expect(computeIncorrectDelayFromSamples([1500])).toBe(6);
  });

  it("après 5 clics rapides (1500 ms) avg=(5×6000+5×1500)/10=3750 ms → 4 s", () => {
    expect(computeIncorrectDelayFromSamples([1500, 1500, 1500, 1500, 1500])).toBe(4);
  });

  it("buffer plein de clics rapides (1000 ms) avg=1000 ms → 2 s", () => {
    const fast = Array(10).fill(1000);
    expect(computeIncorrectDelayFromSamples(fast)).toBe(2);
  });
});

describe("computeIncorrectDelayFromSamples — frontières", () => {
  it("avg = 1999 ms → 2 s", () => {
    expect(computeIncorrectDelayFromSamples(Array(10).fill(1999))).toBe(2);
  });

  it("avg = 2000 ms → 4 s (frontière exclusive)", () => {
    expect(computeIncorrectDelayFromSamples(Array(10).fill(2000))).toBe(4);
  });

  it("avg = 3999 ms → 4 s", () => {
    expect(computeIncorrectDelayFromSamples(Array(10).fill(3999))).toBe(4);
  });

  it("avg = 4000 ms → 6 s (frontière exclusive)", () => {
    expect(computeIncorrectDelayFromSamples(Array(10).fill(4000))).toBe(6);
  });
});
