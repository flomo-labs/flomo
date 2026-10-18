import { z } from "zod";

// Meia estrela em decimos de estrela: 1 a 10 (7 = 3,5 estrelas).
export const halfStarsSchema = z.number().int().min(1).max(10);

export type HalfStars = z.infer<typeof halfStarsSchema>;

// Entradas dos casos de uso de nota (Fase 1.5). Só filme e episódio recebem
// nota; série e temporada mostram a média (docs/regras-de-negocio.md).
export const setRatingInputSchema = z.union([
  z.object({ titleId: z.uuid(), halfStars: halfStarsSchema }),
  z.object({ episodeId: z.uuid(), halfStars: halfStarsSchema }),
]);

export const deleteRatingInputSchema = z.union([
  z.object({ titleId: z.uuid() }),
  z.object({ episodeId: z.uuid() }),
]);

export const titleRatingsInputSchema = z.object({ titleId: z.uuid() });
