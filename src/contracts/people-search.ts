import { z } from "zod";

// Busca de pessoas por handle e nome de exibição (#357). Os limites abaixo
// também valem no banco (função `app.search_people`, migration 0030): termo
// com menos de PEOPLE_SEARCH_MIN_LENGTH caracteres devolve vazio e a página é
// limitada a PEOPLE_SEARCH_MAX_PAGE_SIZE.
export const PEOPLE_SEARCH_MIN_LENGTH = 3;
export const PEOPLE_SEARCH_MAX_QUERY_LENGTH = 50;
// Tamanho máximo do texto recebido; o termo usado é cortado em
// PEOPLE_SEARCH_MAX_QUERY_LENGTH (um texto maior vindo da URL não vira erro).
export const PEOPLE_SEARCH_MAX_INPUT_LENGTH = 500;
export const PEOPLE_SEARCH_PAGE_SIZE = 20;
export const PEOPLE_SEARCH_MAX_PAGE_SIZE = 50;
// Usuários mostrados nas sugestões do campo de busca (a lista completa fica na
// tela Buscar).
export const PEOPLE_SUGGESTION_LIMIT = 5;

// Tira espaços das pontas e o `@` inicial (quem cola `@fulano`). O mínimo conta
// depois disso, como no banco.
export function normalizePeopleQuery(raw: string): string {
  return raw.trim().replace(/^@\s*/, "").trim();
}

// Cursor da busca: grupo de relevância (0 a 3) e handle do último item
// entregue; o handle é único e desempata dentro do grupo.
export const peopleSearchCursorSchema = z.object({
  rank: z.number().int().min(0).max(3),
  handle: z.string().min(1).max(20),
});

export type PeopleSearchCursor = z.infer<typeof peopleSearchCursorSchema>;

export const searchPeopleInputSchema = z.object({
  query: z.string().max(PEOPLE_SEARCH_MAX_INPUT_LENGTH),
  limit: z
    .number()
    .int()
    .min(1)
    .max(PEOPLE_SEARCH_MAX_PAGE_SIZE)
    .default(PEOPLE_SEARCH_PAGE_SIZE),
  // `null` é a primeira página.
  after: peopleSearchCursorSchema.nullable().default(null),
});

// Rolagem infinita da busca: `after` é o cursor do último item recebido.
export const loadMorePeopleSearchInputSchema = z.object({
  query: z.string().max(PEOPLE_SEARCH_MAX_INPUT_LENGTH),
  after: peopleSearchCursorSchema,
});

// Sugestões do campo de busca: só o termo, sem cursor (primeiro trecho).
export const suggestPeopleInputSchema = z.object({
  query: z.string().max(PEOPLE_SEARCH_MAX_INPUT_LENGTH),
});
