import { z } from "zod";

// Entradas dos casos de uso do catálogo (Fase 1.1). A web e o futuro app
// mobile validam com os mesmos schemas (ADR-004).

export const MEDIA_TYPES = ["movie", "tv"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const SEARCH_QUERY_MAX_LENGTH = 100;
// O TMDB não devolve páginas além da 500.
export const SEARCH_MAX_PAGE = 500;

export const catalogSearchInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Digite o que você quer buscar.")
    .max(
      SEARCH_QUERY_MAX_LENGTH,
      `A busca pode ter no máximo ${SEARCH_QUERY_MAX_LENGTH} caracteres.`,
    ),
  page: z.coerce.number().int().min(1).max(SEARCH_MAX_PAGE).default(1),
});
export type CatalogSearchInput = z.input<typeof catalogSearchInputSchema>;

// Sugestões enquanto o usuário digita: a partir de 2 letras, só a primeira
// página da busca, limitada a poucos títulos.
export const SUGGESTION_MIN_LENGTH = 2;
export const SUGGESTION_LIMIT = 5;

export const suggestionsInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(SUGGESTION_MIN_LENGTH, "Digite pelo menos 2 letras.")
    .max(
      SEARCH_QUERY_MAX_LENGTH,
      `A busca pode ter no máximo ${SEARCH_QUERY_MAX_LENGTH} caracteres.`,
    ),
});
export type SuggestionsInput = z.input<typeof suggestionsInputSchema>;

// Resposta de GET /api/sugestoes: só o que a lista mostra.
export type Suggestion = {
  mediaType: "movie" | "tv";
  externalId: string;
  title: string;
  year: string | null;
  posterPath: string | null;
};

// Referência de um título no provedor de catálogo (hoje o TMDB), usada só
// para abrir um resultado de busca que ainda não está no banco. Dentro do
// Flomo o título é identificado pelo uuid (o id do provedor nunca é PK).
export const catalogRefSchema = z.object({
  mediaType: z.enum(MEDIA_TYPES),
  externalId: z.string().regex(/^[1-9][0-9]{0,9}$/, "Id externo inválido."),
});
export type CatalogRefInput = z.input<typeof catalogRefSchema>;

export const titleIdSchema = z.object({
  titleId: z.uuid("Título inválido."),
});

export const seasonEpisodesInputSchema = z.object({
  titleId: z.uuid("Título inválido."),
  seasonNumber: z.coerce.number().int().min(0).max(9999),
});

// Prateleiras do Descobrir (Fase 1.2b): em alta, nos cinemas e "em alta no
// serviço X". Os serviços são uma lista fixa (os principais do Brasil, ids de
// provedor do TMDB), para a entrada nunca virar parâmetro livre do provedor.
export const SHELF_PROVIDER_IDS = [
  "8",
  "119",
  "337",
  "1899",
  "350",
  "531",
  "307",
] as const;
export type ShelfProviderId = (typeof SHELF_PROVIDER_IDS)[number];

// `feminine`: como a marca se refere a si mesma em português ("na Netflix",
// "no Apple TV"); define o artigo do título da prateleira.
const SHELF_PROVIDER_INFO: Record<
  ShelfProviderId,
  { name: string; feminine: boolean }
> = {
  "8": { name: "Netflix", feminine: true },
  "119": { name: "Prime Video", feminine: false },
  "337": { name: "Disney+", feminine: false },
  "1899": { name: "HBO Max", feminine: true },
  "350": { name: "Apple TV", feminine: false },
  "531": { name: "Paramount+", feminine: false },
  "307": { name: "Globoplay", feminine: false },
};

// Em ordem alfabética (é a ordem do seletor no Descobrir; o primeiro é o padrão).
export const SHELF_PROVIDERS = SHELF_PROVIDER_IDS.map((id) => ({
  id,
  ...SHELF_PROVIDER_INFO[id],
})).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

// "all" mistura filmes e séries na mesma prateleira, ordenados por popularidade;
// "novelas" são as séries classificadas como novela (ver provider do TMDB).
export const SHELF_MEDIA_TYPES = ["all", ...MEDIA_TYPES, "novelas"] as const;

export const shelfInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("trending") }),
  z.object({ kind: z.literal("now_playing") }),
  z.object({
    kind: z.literal("provider"),
    mediaType: z.enum(SHELF_MEDIA_TYPES),
    providerId: z.enum(SHELF_PROVIDER_IDS),
  }),
]);
export type ShelfInput = z.input<typeof shelfInputSchema>;
export type ShelfQuery = z.output<typeof shelfInputSchema>;
