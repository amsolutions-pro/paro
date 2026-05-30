import { z } from "zod";

/** Schémas Zod partagés client/serveur pour les routes API. */

export const submitAttemptSchema = z.object({
  userId: z.string().min(1),
  itemId: z.string().min(1),
  userAnswer: z.record(z.string(), z.unknown()),
});
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;

export const manuelQuerySchema = z.object({
  letter: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const exercisesQuerySchema = z.object({
  type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const statsQuerySchema = z.object({
  userId: z.string().min(1),
});

export const reviewQueueQuerySchema = z.object({
  userId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});
