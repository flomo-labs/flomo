import {
  recentSearchInputSchema,
  removeRecentSearchInputSchema,
} from "@/contracts/recent-search";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { RecentSearchDeps, RecentSearchItem } from "./ports";

// Buscas recentes de quem entrou na conta (#425). Regras em
// docs/regras-de-negocio.md, seção Busca. O máximo de itens, a repetição e a
// ordem são garantidos pelo banco (tabela `recent_searches`, migration 0037);
// o caso de uso valida a entrada e repassa. Visitante não tem histórico no
// servidor: a borda recusa antes de chegar aqui.

export type RecentSearchErrorCode = "INVALID_INPUT" | "PERSON_NOT_FOUND";

// Sem entrada: quem pergunta é sempre o usuário logado, e só vê o próprio
// histórico.
export async function listRecentSearches(
  deps: RecentSearchDeps,
  user: AuthenticatedUser,
): Promise<Result<{ items: RecentSearchItem[] }, never>> {
  return ok({ items: await deps.recentSearches.list(user.id) });
}

export async function recordRecentSearch(
  deps: RecentSearchDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<Record<string, never>, RecentSearchErrorCode>> {
  const parsed = recentSearchInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Busca inválida.");
  const outcome = await deps.recentSearches.record(user.id, parsed.data);
  if (outcome === "person_not_found") {
    return fail("PERSON_NOT_FOUND", "Perfil não encontrado.");
  }
  return ok({});
}

// Não falha se o item não existe.
export async function removeRecentSearch(
  deps: RecentSearchDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<Record<string, never>, "INVALID_INPUT">> {
  const parsed = removeRecentSearchInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Busca inválida.");
  await deps.recentSearches.remove(user.id, parsed.data);
  return ok({});
}

export async function clearRecentSearches(
  deps: RecentSearchDeps,
  user: AuthenticatedUser,
): Promise<Result<Record<string, never>, never>> {
  await deps.recentSearches.clear(user.id);
  return ok({});
}
