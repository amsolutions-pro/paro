/**
 * Mesure le temps que l'utilisateur laisse passer avant de cliquer « Suivant »
 * après une bonne réponse, et en déduit un délai d'avancement automatique personnalisé.
 *
 * Stockage : localStorage uniquement (UX locale, pas besoin de sync cross-device).
 * Ne s'active que pour les utilisateurs connectés (non-anonymes).
 */

const MAX_SAMPLES = 20;
const MIN_SAMPLES_TO_ADAPT = 3;

interface TimingData {
  samples: number[]; // durées en millisecondes
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
  } catch { /* quota dépassé — silencieux */ }
}

/** Ajoute un échantillon (en ms) au buffer glissant. */
export function addTimingSample(userId: string, ms: number): void {
  const data = load(userId);
  const samples = [...data.samples, ms].slice(-MAX_SAMPLES);
  save(userId, { samples });
}

/**
 * Retourne le délai d'avancement automatique (en secondes) personnalisé.
 * Revient à 3 s tant que l'historique est insuffisant.
 */
export function computeAutoDelay(userId: string): number {
  const { samples } = load(userId);
  if (samples.length < MIN_SAMPLES_TO_ADAPT) return 3;
  const avgSeconds = samples.reduce((a, b) => a + b, 0) / samples.length / 1000;
  if (avgSeconds < 1.5) return 1;
  if (avgSeconds < 2.5) return 2;
  return 3;
}

/** Nombre d'échantillons collectés (utile pour debug/stats). */
export function sampleCount(userId: string): number {
  return load(userId).samples.length;
}
