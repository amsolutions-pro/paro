/**
 * Révision espacée — algorithme Leitner 5 boîtes + facteur SM-2 allégé.
 * Fonctions pures testées dans tests/unit/srs.test.ts.
 *
 * ⚠️  MODE TEST — intervalles en HEURES pour valider la dynamique sans attendre plusieurs jours.
 *     Remettre SRS_UNIT = "days" avant la mise en prod finale.
 *
 * Intervalles par boîte (en heures, mode test) :
 *   1 → 1h  |  2 → 3h  |  3 → 7h  |  4 → 14h  |  5 → 30h
 */

export const SRS_UNIT: "hours" | "days" = "hours";
export const LEITNER_INTERVALS = [0, 1, 3, 7, 14, 30] as const; // index = box (valeurs en SRS_UNIT)

export interface ReviewState {
  box: number;       // 1..5
  ease: number;      // SM-2 ease factor (≥ 1.3)
  intervalDays: number;
  lapses: number;
  nextReview: Date;
}

export type AnswerQuality = "correct" | "incorrect";

const MIN_EASE = 1.3;
const MAX_BOX = 5;

/**
 * Calcule le nouvel état SRS après une réponse.
 * Renvoie une valeur immuable (ne modifie pas l'état passé).
 */
export function updateSrs(
  state: ReviewState,
  quality: AnswerQuality,
  now: Date = new Date(),
): ReviewState {
  if (quality === "correct") {
    const newBox = Math.min(state.box + 1, MAX_BOX) as 1 | 2 | 3 | 4 | 5;
    const newEase = Math.min(state.ease + 0.1, 2.5);
    const intervalDays = LEITNER_INTERVALS[newBox];
    const nextReview = addInterval(now, intervalDays);
    return { box: newBox, ease: newEase, intervalDays, lapses: state.lapses, nextReview };
  } else {
    const newEase = Math.max(state.ease - 0.2, MIN_EASE);
    return {
      box: 1,
      ease: newEase,
      intervalDays: LEITNER_INTERVALS[1],
      lapses: state.lapses + 1,
      nextReview: addInterval(now, LEITNER_INTERVALS[1]),
    };
  }
}

/** État initial lors de la première révision d'une paire. */
export function initialSrsState(now: Date = new Date()): ReviewState {
  return {
    box: 1,
    ease: 2.5,
    intervalDays: LEITNER_INTERVALS[1],
    lapses: 0,
    nextReview: now, // due immédiatement pour la première rencontre
  };
}

/** Retourne vrai si la révision est due (nextReview ≤ now). */
export function isDue(state: ReviewState, now: Date = new Date()): boolean {
  return state.nextReview <= now;
}

/** Trie les états due par priorité : plus de lapses d'abord, puis nextReview croissant. */
export function sortByPriority(states: ReviewState[]): ReviewState[] {
  return [...states].sort((a, b) => {
    if (b.lapses !== a.lapses) return b.lapses - a.lapses;
    return a.nextReview.getTime() - b.nextReview.getTime();
  });
}

// ── Helper ───────────────────────────────────────────────────────────────────

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function addHours(d: Date, hours: number): Date {
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

function addInterval(d: Date, n: number): Date {
  return SRS_UNIT === "hours" ? addHours(d, n) : addDays(d, n);
}
