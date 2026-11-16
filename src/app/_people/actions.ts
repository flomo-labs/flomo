"use server";

import { loadMorePeopleSearchInputSchema } from "@/contracts/people-search";
import { fail, ok } from "@/domain/result";
import { getCurrentUser } from "../_auth/session";
import { loadPeopleSearch } from "./queries";

// Próximo trecho da busca de pessoas, chamado pela rolagem infinita. A regra de
// quem aparece é do banco (função `app.search_people`).
export async function loadMorePeopleSearch(input: unknown) {
  const user = await getCurrentUser();
  if (!user) {
    return fail("UNAUTHENTICATED", "Sua sessão expirou. Entre de novo.");
  }
  const parsed = loadMorePeopleSearchInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Pedido inválido.");
  const page = await loadPeopleSearch(
    user,
    parsed.data.query,
    parsed.data.after,
  );
  if (!page.ok) {
    return fail(
      page.code,
      page.code === "RATE_LIMITED"
        ? "Muitas requisições. Tente de novo em instantes."
        : "Pedido inválido.",
    );
  }
  return ok({ items: page.items, nextCursor: page.nextCursor });
}
