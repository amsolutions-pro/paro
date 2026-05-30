import { z } from "zod";

/**
 * Les 20 typologies d'exercices (cf. §4/§5 du cahier des charges).
 * SQLite ne supportant pas les enums Prisma, ces valeurs sont stockées en `String`
 * et contraintes ici, côté applicatif.
 */
export const EXERCISE_TYPES = [
  "QCM",
  "TROUS",
  "ANOMALIE",
  "REECRITURE",
  "APPARIEMENT",
  "AFFIXES",
  "CONTEXTE",
  "REMPLACEMENT",
  "VRAIFAUX",
  "TRANSFORMATION",
  "CORRECTION",
  "ETYMOLOGIE",
  "HOMOPHONIE",
  "PAIRE_MINIMALE",
  "PRODUCTION",
  "CATEGORISATION",
  "TRADUCTION",
  "COLLOCATION",
  "DEVINETTE",
  "TEXTE_LACUNAIRE",
] as const;

export type ExerciseType = (typeof EXERCISE_TYPES)[number];
export const exerciseTypeSchema = z.enum(EXERCISE_TYPES);

export const GRADING_MODES = ["AUTO", "OPEN"] as const;
export type GradingMode = (typeof GRADING_MODES)[number];
export const gradingModeSchema = z.enum(GRADING_MODES);

export const POS_CLASSES = ["NOM_M", "NOM_F", "ADJECTIF", "VERBE", "AUTRE"] as const;
export type PosClass = (typeof POS_CLASSES)[number];
export const posClassSchema = z.enum(POS_CLASSES);

/** Métadonnées d'affichage et de comportement par typologie. */
export interface ExerciseTypeMeta {
  type: ExerciseType;
  /** Numéro d'origine dans le livret (1..20). */
  num: number;
  label: string;
  /** Compétence travaillée (résumé). */
  skill: string;
  /** Mode de notation par défaut. */
  defaultGrading: GradingMode;
  /** Interaction principale (pour le moteur de rendu). */
  interaction:
    | "radio"
    | "input"
    | "multi-input"
    | "dnd-pairs"
    | "dnd-bins"
    | "click-correct"
    | "textarea"
    | "toggle-justify"
    | "binary"
    | "inline-blanks";
}

export const EXERCISE_TYPE_META: Record<ExerciseType, ExerciseTypeMeta> = {
  QCM: { type: "QCM", num: 1, label: "Choix multiples", skill: "Reconnaissance lexicale", defaultGrading: "AUTO", interaction: "radio" },
  TROUS: { type: "TROUS", num: 2, label: "Texte à trous", skill: "Sélection contextuelle", defaultGrading: "AUTO", interaction: "multi-input" },
  ANOMALIE: { type: "ANOMALIE", num: 3, label: "Détection d'anomalie", skill: "Repérage de l'erreur", defaultGrading: "AUTO", interaction: "click-correct" },
  REECRITURE: { type: "REECRITURE", num: 4, label: "Réécriture", skill: "Manipulation sémantique", defaultGrading: "OPEN", interaction: "textarea" },
  APPARIEMENT: { type: "APPARIEMENT", num: 5, label: "Appariement", skill: "Association signifiant/signifié", defaultGrading: "AUTO", interaction: "dnd-pairs" },
  AFFIXES: { type: "AFFIXES", num: 6, label: "Préfixes & suffixes", skill: "Conscience morphologique", defaultGrading: "OPEN", interaction: "textarea" },
  CONTEXTE: { type: "CONTEXTE", num: 7, label: "Contextualisation", skill: "Réemploi en contexte", defaultGrading: "OPEN", interaction: "textarea" },
  REMPLACEMENT: { type: "REMPLACEMENT", num: 8, label: "Remplacement de périphrase", skill: "Précision lexicale", defaultGrading: "AUTO", interaction: "input" },
  VRAIFAUX: { type: "VRAIFAUX", num: 9, label: "Vrai / Faux justifié", skill: "Jugement métalinguistique", defaultGrading: "AUTO", interaction: "toggle-justify" },
  TRANSFORMATION: { type: "TRANSFORMATION", num: 10, label: "Transformation grammaticale", skill: "Dérivation", defaultGrading: "AUTO", interaction: "input" },
  CORRECTION: { type: "CORRECTION", num: 11, label: "Correction de phrase", skill: "Vigilance lexicale", defaultGrading: "AUTO", interaction: "input" },
  ETYMOLOGIE: { type: "ETYMOLOGIE", num: 12, label: "Étymologie latine", skill: "Remontée à l'étymon", defaultGrading: "AUTO", interaction: "dnd-pairs" },
  HOMOPHONIE: { type: "HOMOPHONIE", num: 13, label: "Homophonie & orthographe", skill: "Désambiguïsation à l'écrit", defaultGrading: "AUTO", interaction: "input" },
  PAIRE_MINIMALE: { type: "PAIRE_MINIMALE", num: 14, label: "Paire minimale", skill: "Choix binaire en contexte", defaultGrading: "AUTO", interaction: "binary" },
  PRODUCTION: { type: "PRODUCTION", num: 15, label: "Production guidée", skill: "Production écrite contrainte", defaultGrading: "OPEN", interaction: "textarea" },
  CATEGORISATION: { type: "CATEGORISATION", num: 16, label: "Catégorisation grammaticale", skill: "Identification des classes", defaultGrading: "AUTO", interaction: "dnd-bins" },
  TRADUCTION: { type: "TRADUCTION", num: 17, label: "Traduction FR ↔ HY", skill: "Transfert bilingue", defaultGrading: "OPEN", interaction: "textarea" },
  COLLOCATION: { type: "COLLOCATION", num: 18, label: "Collocations", skill: "Association au syntagme", defaultGrading: "AUTO", interaction: "dnd-pairs" },
  DEVINETTE: { type: "DEVINETTE", num: 19, label: "Devinettes", skill: "Restitution lexicale", defaultGrading: "AUTO", interaction: "input" },
  TEXTE_LACUNAIRE: { type: "TEXTE_LACUNAIRE", num: 20, label: "Texte lacunaire suivi", skill: "Cohérence textuelle", defaultGrading: "AUTO", interaction: "inline-blanks" },
};

export function metaForType(type: ExerciseType): ExerciseTypeMeta {
  return EXERCISE_TYPE_META[type];
}
