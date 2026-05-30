/**
 * Formes typées des `payload` (énoncé structuré), `solution` (réponse attendue)
 * et `userAnswer` (réponse de l'apprenant), par typologie.
 * Sérialisées en JSON dans la base ; parsées/validées par le moteur de notation
 * (src/domain/grade.ts) et consommées par les composants de rendu (src/components/exercises).
 */

export interface Option {
  key: string;
  text: string;
}
export interface PairSide {
  id: string;
  text: string;
}

// payloads
export interface QcmPayload {
  options: Option[];
}
export interface TrousPayload {
  bank?: string[];
  blanksCount: number;
}
export interface AnomaliePayload {
  sentence: string;
}
export interface ReecriturePayload {
  source: string;
  target: string;
}
export interface AppariementPayload {
  left: PairSide[];
  right: PairSide[];
}
export interface AffixesPayload {
  pair: string[];
}
export interface ContextePayload {
  word: string;
  constraint: string;
}
export interface RemplacementPayload {
  sentence: string;
  periphrase: string;
}
export interface VraiFauxPayload {
  statement: string;
}
export interface TransformationPayload {
  from: string;
}
export interface CorrectionPayload {
  sentence: string;
  wrong: string;
}
export interface HomophoniePayload {
  hint: string;
  stem: string;
}
export interface PaireMinimalePayload {
  pair: [string, string] | string[];
  sentence: string;
}
export interface ProductionPayload {
  theme: string;
  required: string[];
}
export interface CategorisationPayload {
  items: string[];
  bins: { id: string; label: string }[];
}
export interface TraductionPayload {
  source: string;
  direction: "fr-hy" | "hy-fr";
}
export interface TexteLacunairePayload {
  text: string;
  blanks: { n: number; options: string[] }[];
}

// solutions
export interface ChoiceSolution {
  correctKey: string;
}
export interface AnswersSolution {
  answers: string[];
  accept?: string[];
  accentSensitive?: boolean;
}
export interface SingleAnswerSolution {
  answer: string;
  accept?: string[];
  accentSensitive?: boolean;
}
export interface AnomalieSolution {
  wrong: string;
  correct: string;
  accentSensitive?: boolean;
}
export interface PairsSolution {
  pairs: Record<string, string>;
}
export interface VraiFauxSolution {
  value: boolean;
  justification: string;
}
export interface ModelSolution {
  model: string;
  note?: string;
}
export interface CriteriaSolution {
  criteria: string;
}
export interface AssignSolution {
  assign: Record<string, string>;
}

// userAnswers (ce que l'UI renvoie)
export type QcmAnswer = { key: string };
export type TextAnswer = { text: string };
export type MultiTextAnswer = { answers: string[] };
export type AnomalieAnswer = { wrong: string; correct: string };
export type PairsAnswer = { pairs: Record<string, string> };
export type VraiFauxAnswer = { value: boolean | null; justification?: string };
export type AssignAnswer = { assign: Record<string, string> };
export type SelfEvalAnswer = { text: string; selfEval?: "reussi" | "partiel" | "a-revoir" };
