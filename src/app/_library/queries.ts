import type { CurrentUser } from "@/app/_auth/session";
import type { LibraryFilter } from "@/contracts/library";
import { listLibrary } from "@/domain/library/list-library";
import type { LibraryItem } from "@/domain/library/ports";
import { withUser } from "@/infra/db/client";
import { createLibraryRepository } from "@/infra/db/library-repository";

// Itens da biblioteca do usuário para um filtro; `null` quando a leitura falha.
export async function loadLibraryItems(
  user: CurrentUser,
  filter: LibraryFilter,
): Promise<LibraryItem[] | null> {
  try {
    const result = await withUser(user.claims, (tx) =>
      listLibrary(
        { library: createLibraryRepository(tx), now: () => new Date() },
        { id: user.id },
        { filter },
      ),
    );
    return result.ok ? result.value : null;
  } catch (error) {
    console.error("Falha ao listar a biblioteca:", error);
    return null;
  }
}
