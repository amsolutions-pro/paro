import { z } from "zod";
import {
  exerciseTypeSchema,
  gradingModeSchema,
  posClassSchema,
} from "@/src/lib/exercise-types";

/**
 * Schémas Zod de la SOURCE DE VÉRITÉ du contenu (content/manual.json,
 * content/exercises.json). Validés à l'ingestion et au seeding.
 * payload/solution restent des objets JSON libres ici ; ils sont raffinés
 * par typologie dans le moteur de notation (src/domain/grade.ts).
 */

export const wordSchema = z.object({
  headword: z.string().min(1),
  category: z.string().min(1),
  posClass: posClassSchema,
  translationHy: z.string().optional().default(""),
  definition: z.string().min(1),
  origin: z.string().nullish(),
  synonyms: z.string().nullish(),
  examples: z.array(z.string()).optional().default([]),
  reviewNeeded: z.boolean().optional().default(false),
});
export type WordContent = z.infer<typeof wordSchema>;

export const manualGroupSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  letter: z.string().min(1),
  summary: z.string().min(1),
  words: z.array(wordSchema).min(2),
});
export type ManualGroupContent = z.infer<typeof manualGroupSchema>;

export const manualFileSchema = z.array(manualGroupSchema);

export const exerciseItemSchema = z.object({
  slug: z.string().min(1),
  type: exerciseTypeSchema,
  gradingMode: gradingModeSchema,
  prompt: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
  solution: z.record(z.string(), z.unknown()).default({}),
  commentary: z.string().default(""),
  groupSlug: z.string().nullish(),
  posClass: posClassSchema.nullish(),
  source: z.enum(["manuel", "generated"]).optional().default("manuel"),
  reviewNeeded: z.boolean().optional().default(false),
  orderIndex: z.number().int().optional().default(0),
});
export type ExerciseItemContent = z.infer<typeof exerciseItemSchema>;

export const exercisesFileSchema = z.array(exerciseItemSchema);
