import { z } from "zod";
import { MEDIA_TYPES } from "./catalog";
import { handleSchema } from "./profile";

// Buscas recentes de quem entrou na conta (#425). Cada pessoa guarda até
// RECENT_SEARCHES_MAX itens, do mais novo para o mais antigo, sem repetir.
// Os limites de texto abaixo também valem no banco (`CHECK` da tabela
// `recent_searches`, migration 0037): mudar um exige mudar o outro.
export const RECENT_SEARCHES_MAX = 8;
export const RECENT_SEARCH_TERM_MAX_LENGTH = 100;
export const RECENT_SEARCH_TITLE_MAX_LENGTH = 200;

const termSchema = z
  .string()
  .trim()
  .min(1, "Termo inválido.")
  .max(RECENT_SEARCH_TERM_MAX_LENGTH, "Termo inválido.");

// Mesmo formato de `catalogRefSchema` (id do provedor de catálogo).
const mediaTypeSchema = z.enum(MEDIA_TYPES);
const externalIdSchema = z
  .string()
  .regex(/^[1-9][0-9]{0,9}$/, "Id externo inválido.");

// Caminho do pôster no provedor, como `/abc123.jpg`.
const posterPathSchema = z
  .string()
  .regex(/^\/[A-Za-z0-9_-]{1,100}\.[A-Za-z0-9]{2,5}$/, "Pôster inválido.");

// O que identifica cada tipo de item (e decide a repetição): o termo sem
// diferenciar maiúsculas, o título pelo tipo e id do provedor, e a pessoa pelo
// handle.
const queryKeySchema = z.object({
  kind: z.literal("query"),
  term: termSchema,
});
const titleKeySchema = z.object({
  kind: z.literal("title"),
  mediaType: mediaTypeSchema,
  externalId: externalIdSchema,
});
const personKeySchema = z.object({
  kind: z.literal("person"),
  handle: handleSchema,
});

// Item a registrar: a chave e o que a lista mostra. De pessoa, nome e foto
// vêm sempre do perfil atual (o servidor não confia no que o cliente manda).
export const recentSearchInputSchema = z.discriminatedUnion("kind", [
  queryKeySchema,
  titleKeySchema.extend({
    title: z
      .string()
      .trim()
      .min(1, "Título inválido.")
      .max(RECENT_SEARCH_TITLE_MAX_LENGTH, "Título inválido."),
    year: z
      .string()
      .regex(/^[0-9]{4}$/, "Ano inválido.")
      .nullable()
      .default(null),
    posterPath: posterPathSchema.nullable().default(null),
  }),
  personKeySchema,
]);
export type RecentSearchInput = z.infer<typeof recentSearchInputSchema>;

// Item a remover: só a chave.
export const removeRecentSearchInputSchema = z.discriminatedUnion("kind", [
  queryKeySchema,
  titleKeySchema,
  personKeySchema,
]);
export type RemoveRecentSearchInput = z.infer<
  typeof removeRecentSearchInputSchema
>;
