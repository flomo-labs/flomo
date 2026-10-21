import {
  type LibraryFilter,
  listLibraryInputSchema,
} from "@/contracts/library";
import { CATALOG_COUNTRY, CATALOG_LOCALE } from "../catalog/types";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { LibraryItem } from "./ports";
import type { LibraryDeps } from "./mark-watched";
import type { LibraryStatus } from "./values";
import { todayIn } from "./watch-date";

const SCOPE_BY_FILTER: Record<
  LibraryFilter,
  { statuses: readonly LibraryStatus[] | null; hidden: boolean }
> = {
  all: { statuses: null, hidden: false },
  watching: { statuses: ["watching"], hidden: false },
  watchlist: { statuses: ["watchlist"], hidden: false },
  paused: { statuses: ["paused"], hidden: false },
  watched: { statuses: ["watched"], hidden: false },
  hidden: { statuses: null, hidden: true },
};

// Biblioteca do usuário para a tela (Fase 1.4): títulos com status e, nas
// séries, quantos episódios lançados ele já viu.
export async function listLibrary(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<LibraryItem[], "INVALID_INPUT">> {
  const parsed = listLibraryInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Filtro inválido.");
  return ok(
    await deps.library.listLibrary(
      user.id,
      SCOPE_BY_FILTER[parsed.data.filter],
      CATALOG_LOCALE,
      todayIn(CATALOG_COUNTRY, deps.now()),
      { mediaType: parsed.data.mediaType, limit: parsed.data.limit },
    ),
  );
}
