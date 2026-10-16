import { z } from "zod";

// Entradas dos casos de uso da biblioteca (Fase 1.3). Valem para a web e,
// depois, para a API e o app.

// Quando foi visto. `now` = agora; `unknown` = sem data; `date` = data
// informada pelo usuário, com a precisão que ele souber (dia, mês ou ano).
// Ausente, vale o padrão da situação (src/domain/library/watch-date.ts).
const datePatterns = {
  day: /^\d{4}-\d{2}-\d{2}$/,
  month: /^\d{4}-\d{2}$/,
  year: /^\d{4}$/,
} as const;

export const watchDateInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("now") }),
  z.object({ kind: z.literal("unknown") }),
  z
    .object({
      kind: z.literal("date"),
      precision: z.enum(["day", "month", "year"]),
      // AAAA-MM-DD, AAAA-MM ou AAAA, conforme a precisão.
      value: z.string(),
    })
    .refine((d) => datePatterns[d.precision].test(d.value), {
      message: "Data em formato inválido.",
      path: ["value"],
    }),
]);

export type WatchDateInput = z.infer<typeof watchDateInputSchema>;

export const markEpisodeWatchedInputSchema = z.object({
  episodeId: z.uuid(),
  when: watchDateInputSchema.optional(),
  // Marca também os episódios anteriores ainda não vistos.
  includePrevious: z.boolean().default(false),
});

export const markMovieWatchedInputSchema = z.object({
  titleId: z.uuid(),
  when: watchDateInputSchema.optional(),
});

export const unmarkEpisodeWatchedInputSchema = z.object({
  episodeId: z.uuid(),
});

export const unmarkMovieWatchedInputSchema = z.object({
  titleId: z.uuid(),
});

export const setWatchDateInputSchema = z.object({
  eventId: z.uuid(),
  when: watchDateInputSchema,
});

export const titleLibraryStateInputSchema = z.object({
  titleId: z.uuid(),
});
