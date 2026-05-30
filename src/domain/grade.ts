/**
 * Moteur de notation AUTO — fonctions pures (sans I/O, sans dépendance Prisma).
 * Chaque type d'exercice a sa stratégie de normalisation et de comparaison.
 * Les tests sont dans tests/unit/grade.test.ts.
 */

export type GradeResult =
  | { correct: true }
  | { correct: false; expected?: string | string[] };

// ── Helpers de normalisation ────────────────────────────────────────────────

/** Normalise une chaîne : minuscules, espaces colapsés, trim. */
function norm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Normalise en supprimant aussi les accents (pour les types où l'accent est toléré). */
function normNoAccent(s: string): string {
  return norm(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function matches(
  userRaw: string,
  canonical: string,
  accept: string[] | undefined,
  accentSensitive: boolean,
): boolean {
  const n = accentSensitive ? norm : normNoAccent;
  const user = n(userRaw);
  if (user === n(canonical)) return true;
  if (accept) return accept.some((a) => user === n(a));
  return false;
}

// ── Formes des payloads et solutions attendues par le grade ─────────────────

interface QcmSol { correctKey: string }
interface AnswersSol { answers: string[]; accept?: string[]; accentSensitive?: boolean }
interface SingleSol { answer: string; accept?: string[]; accentSensitive?: boolean }
interface AnomalieSol { wrong: string; correct: string; accentSensitive?: boolean }
interface PairsSol { pairs: Record<string, string> }
interface VraiFauxSol { value: boolean }
interface AssignSol { assign: Record<string, string> }

// ── grade() — point d'entrée unique ─────────────────────────────────────────

/**
 * @param type     Typologie de l'exercice
 * @param userAnswer  Réponse de l'apprenant (structure dépend du type)
 * @param solution    Corrigé (structure dépend du type)
 */
export function grade(
  type: string,
  userAnswer: unknown,
  solution: unknown,
): GradeResult {
  switch (type) {
    case "QCM":
      return gradeQcm(userAnswer as { key: string }, solution as QcmSol);
    case "TROUS":
      return gradeAnswers(userAnswer as { answers: string[] }, solution as AnswersSol);
    case "ANOMALIE":
      return gradeAnomalie(
        userAnswer as { wrong: string; correct: string },
        solution as AnomalieSol,
      );
    case "REMPLACEMENT":
    case "TRANSFORMATION":
    case "CORRECTION":
    case "HOMOPHONIE":
    case "DEVINETTE":
      return gradeSingle(userAnswer as { text: string }, solution as SingleSol);
    case "PAIRE_MINIMALE":
      return gradeSingle(userAnswer as { text: string }, solution as SingleSol);
    case "APPARIEMENT":
    case "ETYMOLOGIE":
    case "COLLOCATION":
      return gradePairs(userAnswer as { pairs: Record<string, string> }, solution as PairsSol);
    case "VRAIFAUX":
      return gradeVraiFaux(userAnswer as { value: boolean | null }, solution as VraiFauxSol);
    case "TRANSFORMATION":
      return gradeSingle(userAnswer as { text: string }, solution as SingleSol);
    case "CATEGORISATION":
      return gradeCategorisation(
        userAnswer as { assign: Record<string, string> },
        solution as AssignSol,
      );
    case "TEXTE_LACUNAIRE":
      return gradeAnswers(userAnswer as { answers: string[] }, solution as AnswersSol);
    // OPEN : reecriture, affixes, contexte, production, traduction → never graded AUTO
    default:
      return { correct: false, expected: "type inconnu ou mode OPEN" };
  }
}

// ── Stratégies individuelles ─────────────────────────────────────────────────

function gradeQcm(
  user: { key?: string },
  sol: QcmSol,
): GradeResult {
  if (!user.key) return { correct: false, expected: sol.correctKey };
  return user.key === sol.correctKey
    ? { correct: true }
    : { correct: false, expected: sol.correctKey };
}

function gradeAnswers(
  user: { answers?: string[] },
  sol: AnswersSol,
): GradeResult {
  const answers = user.answers ?? [];
  const accentSensitive = sol.accentSensitive ?? false;
  for (let i = 0; i < sol.answers.length; i++) {
    const ua = answers[i] ?? "";
    if (!matches(ua, sol.answers[i], sol.accept, accentSensitive)) {
      return { correct: false, expected: sol.answers };
    }
  }
  return { correct: true };
}

function gradeAnomalie(
  user: { wrong?: string; correct?: string },
  sol: AnomalieSol,
): GradeResult {
  const accentSensitive = sol.accentSensitive ?? false;
  const n = accentSensitive ? norm : normNoAccent;
  const wrongOk = n(user.wrong ?? "") === n(sol.wrong);
  const correctOk = matches(user.correct ?? "", sol.correct, undefined, accentSensitive);
  if (wrongOk && correctOk) return { correct: true };
  return { correct: false, expected: `wrong=${sol.wrong}, correct=${sol.correct}` };
}

function gradeSingle(
  user: { text?: string; answer?: string },
  sol: SingleSol,
): GradeResult {
  const ua = (user.text ?? user.answer ?? "").toString();
  const accentSensitive = sol.accentSensitive ?? false;
  return matches(ua, sol.answer, sol.accept, accentSensitive)
    ? { correct: true }
    : { correct: false, expected: sol.accept ?? sol.answer };
}

function gradePairs(
  user: { pairs?: Record<string, string> },
  sol: PairsSol,
): GradeResult {
  const pairs = user.pairs ?? {};
  for (const [leftId, rightId] of Object.entries(sol.pairs)) {
    if (pairs[leftId] !== rightId) {
      return { correct: false, expected: JSON.stringify(sol.pairs) };
    }
  }
  return { correct: true };
}

function gradeVraiFaux(
  user: { value?: boolean | null },
  sol: VraiFauxSol,
): GradeResult {
  if (user.value === null || user.value === undefined) {
    return { correct: false, expected: String(sol.value) };
  }
  return user.value === sol.value
    ? { correct: true }
    : { correct: false, expected: String(sol.value) };
}

function gradeCategorisation(
  user: { assign?: Record<string, string> },
  sol: AssignSol,
): GradeResult {
  const assign = user.assign ?? {};
  for (const [word, expected] of Object.entries(sol.assign)) {
    if (assign[word] !== expected) {
      return { correct: false, expected: JSON.stringify(sol.assign) };
    }
  }
  return { correct: true };
}
