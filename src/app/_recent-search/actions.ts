"use server";

import {
  clearRecentSearches,
  listRecentSearches,
  recordRecentSearch,
  removeRecentSearch,
  type RecentSearchErrorCode,
} from "@/domain/recent-search/recent-search";
import type { RecentSearchItem } from "@/domain/recent-search/ports";
import { fail, type Result } from "@/domain/result";
import { withUser } from "@/infra/db/client";
import { createRecentSearchRepository } from "@/infra/db/recent-search-repository";
import { createRateLimiter } from "@/lib/rate-limit";
import { getCurrentUser } from "../_auth/session";

// Camada fina (ADR-004): resolve o usuário, chama o caso de uso dentro do
// `withUser` (RLS) e devolve o resultado. A regra fica em
// domain/recent-search/recent-search.ts. Cada ação confere o login por conta
// própria: Server Actions aceitam POST direto, não só os botões da tela.
// Visitante não tem histórico no servidor: recebe UNAUTHENTICATED e nada é
// lido nem gravado.

export type RecentSearchActionResult<T = Record<string, never>> = Result<
  T,
  RecentSearchErrorCode | "UNAUTHENTICATED" | "RATE_LIMITED"
>;

// Limite de pedidos por usuário, com a leitura separada da escrita. Conta na
// memória de cada instância, como o das sugestões da busca
// (src/lib/rate-limit.ts), então é um freio parcial; o que cresce no banco já
// é limitado pelo máximo de 8 itens por pessoa.
const checkRead = createRateLimiter({
  limit: 60,
  windowMs: 60_000,
  maxKeys: 5000,
});
const checkWrite = createRateLimiter({
  limit: 30,
  windowMs: 60_000,
  maxKeys: 5000,
});

type Check = typeof checkRead;
type Deps = { recentSearches: ReturnType<typeof createRecentSearchRepository> };

async function run<T>(
  check: Check,
  useCase: (
    deps: Deps,
    user: { id: string },
    input: unknown,
  ) => Promise<Result<T, RecentSearchErrorCode>>,
  input?: unknown,
): Promise<RecentSearchActionResult<T>> {
  const user = await getCurrentUser();
  if (!user) {
    return fail("UNAUTHENTICATED", "Sua sessão expirou. Entre de novo.");
  }
  if (!check(user.id, Date.now()).allowed) {
    return fail(
      "RATE_LIMITED",
      "Muitas requisições. Tente de novo em instantes.",
    );
  }
  return withUser(user.claims, (tx) =>
    useCase(
      { recentSearches: createRecentSearchRepository(tx) },
      { id: user.id },
      input,
    ),
  );
}

export async function listRecents(): Promise<
  RecentSearchActionResult<{ items: RecentSearchItem[] }>
> {
  return run(checkRead, (deps, user) => listRecentSearches(deps, user));
}

export async function recordRecent(input: unknown) {
  return run(checkWrite, recordRecentSearch, input);
}

export async function removeRecent(input: unknown) {
  return run(checkWrite, removeRecentSearch, input);
}

export async function clearRecents() {
  return run(checkWrite, (deps, user) => clearRecentSearches(deps, user));
}
