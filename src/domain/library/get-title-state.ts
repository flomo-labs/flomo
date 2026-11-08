import {
  refsInLibraryInputSchema,
  titleLibraryStateInputSchema,
} from "@/contracts/library";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import { CATALOG_COUNTRY, type CatalogRef } from "../catalog/types";
import type { LibraryDeps } from "./mark-watched";
import type { TitleLibraryState } from "./ports";
import { todayIn } from "./watch-date";

// Leitura para as telas (Fase 1.4): o que o usuário já viu de um título.
export async function getTitleLibraryState(
  deps: Pick<LibraryDeps, "library">,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<TitleLibraryState, "INVALID_INPUT">> {
  const parsed = titleLibraryStateInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Título inválido.");
  return ok(await deps.library.getTitleState(user.id, parsed.data.titleId));
}

// Episódios regulares lançados que o usuário ainda não viu, para a tela
// perguntar sobre os anteriores ao marcar um episódio sem consultar o
// servidor no clique.
export async function listUnwatchedEpisodes(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<
  Result<{ seasonNumber: number; episodeNumber: number }[], "INVALID_INPUT">
> {
  const parsed = titleLibraryStateInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Título inválido.");
  return ok(
    await deps.library.listUnwatchedReleased(
      user.id,
      parsed.data.titleId,
      todayIn(CATALOG_COUNTRY, deps.now()),
    ),
  );
}

// Quais das referências (resultados de busca) já estão na biblioteca do
// usuário, para o atalho de adicionar mostrar o estado certo.
export async function listRefsInLibrary(
  deps: Pick<LibraryDeps, "library">,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<CatalogRef[], "INVALID_INPUT">> {
  const parsed = refsInLibraryInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Dados inválidos.");
  return ok(await deps.library.findRefsInLibrary(user.id, parsed.data.refs));
}
