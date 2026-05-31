/**
 * Délai d'avancement automatique personnalisé — bonnes ET mauvaises réponses.
 *
 * Principe : le buffer démarre conceptuellement rempli de valeurs par défaut.
 * Chaque clic rapide remplace progressivement les valeurs initiales et tire
 * la moyenne vers le bas. Pas de seuil minimum — l'adaptation est immédiate.
 *
 *   correct   : buffer 5 × 3000 ms → seuils 1/2/3 s
 *   incorrect : buffer 10 × 6000 ms → seuils 2/4/6 s
 */

export const CORRECT_MAX_SAMPLES   = 5;
export const INCORRECT_MAX_SAMPLES = 10;
export const CORRECT_DEFAULT_MS    = 3000;
export const INCORRECT_DEFAULT_MS  = 6000;

// Alias rétrocompatible.
export const MAX_SAMPLES = CORRECT_MAX_SAMPLES;

// ── Fonctions pures (testables) ───────────────────────────────────────────────

/**
 * Ajoute un échantillon au buffer et retourne le nouveau tableau
 * (garde les `maxSamples` entrées les plus récentes).
 */
export function addSample(
  samples: number[],
  ms: number,
  maxSamples: number = CORRECT_MAX_SAMPLES,
): number[] {
  return [...samples, ms].slice(-maxSamples);
}

/**
 * Complète le buffer avec des valeurs par défaut pour atteindre `maxSamples`.
 * Simule un historique initial "neutre" sans nécessiter de seuil minimum.
 */
export function padWithDefault(
  samples: number[],
  maxSamples: number,
  defaultMs: number,
): number[] {
  const needed = Math.max(0, maxSamples - samples.length);
  return [...Array<number>(needed).fill(defaultMs), ...samples];
}

/**
 * Délai adapté pour une bonne réponse (défaut 3 s).
 * Seuils : avg < 1,5 s → 1 s | avg < 2,5 s → 2 s | sinon → 3 s
 */
export function computeDelayFromSamples(rawSamples: number[]): number {
  const samples = padWithDefault(rawSamples, CORRECT_MAX_SAMPLES, CORRECT_DEFAULT_MS);
  const avgS = samples.reduce((a, b) => a + b, 0) / samples.length / 1000;
  if (avgS < 1.5) return 1;
  if (avgS < 2.5) return 2;
  return 3;
}

/**
 * Délai adapté pour une mauvaise réponse (défaut 6 s).
 * Seuils : avg < 2 s → 2 s | avg < 4 s → 4 s | sinon → 6 s
 */
export function computeIncorrectDelayFromSamples(rawSamples: number[]): number {
  const samples = padWithDefault(rawSamples, INCORRECT_MAX_SAMPLES, INCORRECT_DEFAULT_MS);
  const avgS = samples.reduce((a, b) => a + b, 0) / samples.length / 1000;
  if (avgS < 2) return 2;
  if (avgS < 4) return 4;
  return 6;
}

// ── Couche localStorage ───────────────────────────────────────────────────────

interface TimingData { samples: number[] }

function makeStorage(suffix: string) {
  const key = (userId: string) => `paro:timing${suffix}:${userId}`;

  function load(userId: string): TimingData {
    try {
      const raw = localStorage.getItem(key(userId));
      return raw ? (JSON.parse(raw) as TimingData) : { samples: [] };
    } catch { return { samples: [] }; }
  }

  function save(userId: string, data: TimingData): void {
    try { localStorage.setItem(key(userId), JSON.stringify(data)); }
    catch { /* quota dépassé */ }
  }

  return { load, save };
}

const correctStore   = makeStorage("");         // paro:timing:userId
const incorrectStore = makeStorage("-wrong");   // paro:timing-wrong:userId

// ── API publique — bonnes réponses ────────────────────────────────────────────

export function addTimingSample(userId: string, ms: number): void {
  const { samples } = correctStore.load(userId);
  correctStore.save(userId, { samples: addSample(samples, ms, CORRECT_MAX_SAMPLES) });
}

export function computeAutoDelay(userId: string): number {
  return computeDelayFromSamples(correctStore.load(userId).samples);
}

export function clearTimingSamples(userId: string): void {
  correctStore.save(userId, { samples: [] });
}

// ── API publique — mauvaises réponses ─────────────────────────────────────────

export function addIncorrectTimingSample(userId: string, ms: number): void {
  const { samples } = incorrectStore.load(userId);
  incorrectStore.save(userId, { samples: addSample(samples, ms, INCORRECT_MAX_SAMPLES) });
}

export function computeIncorrectAutoDelay(userId: string): number {
  return computeIncorrectDelayFromSamples(incorrectStore.load(userId).samples);
}

export function clearIncorrectTimingSamples(userId: string): void {
  incorrectStore.save(userId, { samples: [] });
}

/** Nombre d'échantillons enregistrés (correct / incorrect). */
export function sampleCount(userId: string): { correct: number; incorrect: number } {
  return {
    correct:   correctStore.load(userId).samples.length,
    incorrect: incorrectStore.load(userId).samples.length,
  };
}
