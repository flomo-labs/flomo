import type { CurrentUser } from "@/app/_auth/session";
import type { LibraryFilter } from "@/contracts/library";
import { listRefsInLibrary } from "@/domain/library/get-title-state";
import type { CatalogRef } from "@/domain/catalog/types";
import { listLibrary } from "@/domain/library/list-library";
import type { LibraryPreview } from "@/domain/library/library-preview";
import { PREVIEW_SIZE } from "@/domain/library/library-preview";
import type { LibraryItem } from "@/domain/library/ports";
import { libraryRefsDeps } from "./library-refs-deps";
import { withUser } from "@/infra/db/client";
import { createLibraryRepository } from "@/infra/db/library-repository";

// Itens da biblioteca do usuário para um filtro (e, se pedido, um tipo); `null` quando a leitura falha.
export async function loadLibraryItems(
  user: CurrentUser,
  filter: LibraryFilter,
  mediaType?: "tv" | "movie",
): Promise<LibraryItem[] | null> {
  try {
    const result = await withUser(user.claims, (tx) =>
      listLibrary(
        { library: createLibraryRepository(tx), now: () => new Date() },
        { id: user.id },
        { filter, mediaType },
      ),
    );
    return result.ok ? result.value : null;
  } catch (error) {
    console.error("Falha ao listar a biblioteca:", error);
    return null;
  }
}

// Prévia do perfil: os primeiros títulos de cada tipo (sem ocultos), lidos já
// limitados no banco.
export async function loadLibraryPreview(
  user: CurrentUser,
  perType: number = PREVIEW_SIZE,
): Promise<LibraryPreview | null> {
  try {
    return await withUser(user.claims, async (tx) => {
      const deps = {
        library: createLibraryRepository(tx),
        now: () => new Date(),
      };
      const read = (mediaType: "tv" | "movie") =>
        listLibrary(
          deps,
          { id: user.id },
          {
            filter: "all",
            mediaType,
            limit: perType,
          },
        );
      const [series, movies] = [await read("tv"), await read("movie")];
      if (!series.ok || !movies.ok) return null;
      return { series: series.value, movies: movies.value };
    });
  } catch (error) {
    console.error("Falha ao listar a biblioteca:", error);
    return null;
  }
}

// Das referências dadas (resultados de busca), as que o usuário já tem na
// biblioteca, numa consulta só. `null` quando não dá para ler; chamar só com
// usuário logado.
export async function loadRefsInLibrary(
  user: CurrentUser,
  refs: CatalogRef[],
): Promise<CatalogRef[] | null> {
  try {
    const result = await listRefsInLibrary(
      libraryRefsDeps(user),
      { id: user.id },
      { refs },
    );
    return result.ok ? result.value : null;
  } catch (error) {
    console.error("Falha ao ler a biblioteca:", error);
    return null;
  }
}
