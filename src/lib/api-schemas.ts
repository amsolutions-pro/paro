import { z } from "zod";

/** Schémas Zod partagés client/serveur pour les routes API. */

export const submitAttemptSchema = z.object({
  userId: z.string().optional(), // facultatif : le serveur préfère l'id de session
  itemId: z.string().min(1),
  userAnswer: z.record(z.string(), z.unknown()),
});
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;

export const manuelQuerySchema = z.object({
  letter: z.union([z.string(), z.array(z.string())]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const exercisesQuerySchema = z.object({
  type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  userId: z.string().optional(),
});

export const statsQuerySchema = z.object({
  userId: z.string().optional(),
});

export const reviewQueueQuerySchema = z.object({
  userId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(10),
  all: z.preprocess((v) => v === "true" || v === "1", z.boolean()).default(false),
});
