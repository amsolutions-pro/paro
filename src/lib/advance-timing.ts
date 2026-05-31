/**
 * Délai d'avancement automatique personnalisé.
 * Mesure le temps entre l'affichage d'une bonne réponse et le clic "Suivant",
 * calcule une moyenne glissante, et déduit un délai adapté.
 *
 * Fonctions pures exportées séparément pour être testables sans localStorage.
 */

export const MAX_SAMPLES = 5;
export const MIN_SAMPLES_TO_ADAPT = 3;

// ── Fonctions pures (testables) ───────────────────────────────────────────────

/**
 * Ajoute un échantillon au buffer et retourne le nouveau tableau
 * (max MAX_SAMPLES entrées, les plus récentes).
 */
export function addSample(samples: number[], ms: number): number[] {
  return [...samples, ms].slice(-MAX_SAMPLES);
}

/**
 * Calcule le délai recommandé (en secondes) à partir d'un buffer d'échantillons.
 * Retourne 3 s tant que le buffer est insuffisant.
 */
export function computeDelayFromSamples(samples: number[]): number {
  if (samples.length < MIN_SAMPLES_TO_ADAPT) return 3;
  const avgMs = samples.reduce((a, b) => a + b, 0) / samples.length;
  const avgS = avgMs / 1000;
  if (avgS < 1.5) return 1;
  if (avgS < 2.5) return 2;
  return 3;
}

// ── Couche localStorage ───────────────────────────────────────────────────────

interface TimingData {
  samples: number[];
}

function storageKey(userId: string): string {
  return `paro:timing:${userId}`;
}

function load(userId: string): TimingData {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as TimingData) : { samples: [] };
  } catch {
    return { samples: [] };
  }
}

function save(userId: string, data: TimingData): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(data));
  } catch { /* quota dépassé */ }
}

/** Ajoute un échantillon (en ms) au buffer persisté. */
export function addTimingSample(userId: string, ms: number): void {
  const data = load(userId);
  save(userId, { samples: addSample(data.samples, ms) });
}

/** Délai personnalisé (en secondes) pour cet utilisateur. */
export function computeAutoDelay(userId: string): number {
  return computeDelayFromSamples(load(userId).samples);
}

/** Vide le buffer — signal que l'utilisateur a besoin de plus de temps. */
export function clearTimingSamples(userId: string): void {
  save(userId, { samples: [] });
}

/** Nombre d'échantillons collectés. */
export function sampleCount(userId: string): number {
  return load(userId).samples.length;
}
