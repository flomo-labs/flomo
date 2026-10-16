import { titleLibraryStateInputSchema } from "@/contracts/library";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import { CATALOG_COUNTRY } from "../catalog/types";
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
