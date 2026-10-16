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
