import {
  normalizePeopleQuery,
  PEOPLE_SEARCH_MAX_QUERY_LENGTH,
  PEOPLE_SEARCH_MIN_LENGTH,
  searchPeopleInputSchema,
} from "@/contracts/people-search";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { PeopleSearchDeps, PersonSearchEntry } from "./ports";

// Busca de pessoas (#357). Regras em docs/regras-de-negocio.md, seção Busca.
// Termo curto demais não consulta o banco: volta vazio com `tooShort`, para a
// tela pedir mais letras em vez de dizer que ninguém foi encontrado.
export async function searchPeople(
  deps: PeopleSearchDeps,
  _user: AuthenticatedUser,
  input: unknown,
): Promise<
  Result<{ people: PersonSearchEntry[]; tooShort: boolean }, "INVALID_INPUT">
> {
  const parsed = searchPeopleInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Pedido inválido.");
  const { query, limit, after } = parsed.data;
  const term = normalizePeopleQuery(query).slice(
    0,
    PEOPLE_SEARCH_MAX_QUERY_LENGTH,
  );
  if (term.length < PEOPLE_SEARCH_MIN_LENGTH) {
    return ok({ people: [], tooShort: true });
  }
  return ok({
    people: await deps.people.search(term, { limit, after }),
    tooShort: false,
  });
}
