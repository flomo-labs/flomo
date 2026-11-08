import { z } from "zod";
import { catalogRefSchema } from "./catalog";

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

// Ao marcar, também vale "no dia da exibição/lançamento": a data vem do
// catálogo (`airDate` do episódio, data de lançamento do filme), uma para
// cada item. Sem data no catálogo, o registro fica sem data. Vale ao
// marcar e ao trocar a data de um registro; "rever" usa `watchDateInputSchema`.
export const markWatchDateInputSchema = z.discriminatedUnion("kind", [
  ...watchDateInputSchema.options,
  z.object({ kind: z.literal("airDate") }),
]);

export type MarkWatchDateInput = z.infer<typeof markWatchDateInputSchema>;

export const markEpisodeWatchedInputSchema = z.object({
  episodeId: z.uuid(),
  when: markWatchDateInputSchema.optional(),
  // Marca também os episódios anteriores ainda não vistos.
  includePrevious: z.boolean().default(false),
});

export const markMovieWatchedInputSchema = z.object({
  titleId: z.uuid(),
  when: markWatchDateInputSchema.optional(),
});

// Marcar a temporada inteira (regular, sem especiais). A data é obrigatória:
// a tela sempre pergunta, para não inflar as estatísticas de hoje sem querer.
export const markSeasonWatchedInputSchema = z.object({
  titleId: z.uuid(),
  seasonNumber: z.number().int().min(1).max(1000),
  when: markWatchDateInputSchema,
});

// Desfazer a marcação da temporada: os episódios que ela marcou.
export const unmarkEpisodesWatchedInputSchema = z.object({
  episodeIds: z.array(z.uuid()).min(1).max(1000),
});

export const unmarkEpisodeWatchedInputSchema = z.object({
  episodeId: z.uuid(),
});

export const unmarkMovieWatchedInputSchema = z.object({
  titleId: z.uuid(),
});

export const setWatchDateInputSchema = z.object({
  eventId: z.uuid(),
  when: markWatchDateInputSchema,
});

export const titleLibraryStateInputSchema = z.object({
  titleId: z.uuid(),
});

// Registrar de novo (rever): o item já tem de estar visto.
export const rewatchEpisodeInputSchema = z.object({
  episodeId: z.uuid(),
  when: watchDateInputSchema.optional(),
});

export const rewatchMovieInputSchema = z.object({
  titleId: z.uuid(),
  when: watchDateInputSchema.optional(),
});

// Apagar um registro específico do histórico (escolhido na lista).
export const deleteWatchRecordInputSchema = z.object({
  eventId: z.uuid(),
});

// Filtros da tela da biblioteca (Fase 1.4). "all" mostra tudo, inclusive
// Assistido e Abandonado, menos os ocultos; "hidden" mostra só os ocultos.
export const LIBRARY_FILTERS = [
  "all",
  "watching",
  "watchlist",
  "paused",
  "watched",
  "hidden",
] as const;
export type LibraryFilter = (typeof LIBRARY_FILTERS)[number];

export const listLibraryInputSchema = z.object({
  filter: z.enum(LIBRARY_FILTERS).default("all"),
  // Só um tipo e/ou só os primeiros títulos (prévia do perfil).
  mediaType: z.enum(["tv", "movie"]).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Colocar o título na biblioteca (ou mudar a situação) sem marcar nada.
// "Assistido" fica de fora: vem de marcar o que foi visto, para a situação
// não contradizer o histórico.
export const MANUAL_LIBRARY_STATUSES = [
  "watchlist",
  "watching",
  "paused",
  "dropped",
] as const;

export const setTitleStatusInputSchema = z.object({
  titleId: z.uuid(),
  status: z.enum(MANUAL_LIBRARY_STATUSES),
});

// Guardar na biblioteca (em "Quero ver") um título que ainda pode não estar no
// catálogo local: a entrada é a referência do provedor, como na busca.
export const addTitleByRefInputSchema = catalogRefSchema;

// Quais títulos de uma lista de resultados já estão na biblioteca. Uma
// consulta para a lista inteira (sugestões da busca e resultados).
export const MAX_REFS_IN_LIBRARY = 50;
export const refsInLibraryInputSchema = z.object({
  refs: z.array(catalogRefSchema).max(MAX_REFS_IN_LIBRARY),
});

export const setTitleHiddenInputSchema = z.object({
  titleId: z.uuid(),
  hidden: z.boolean(),
});

export const removeTitleInputSchema = z.object({
  titleId: z.uuid(),
});
