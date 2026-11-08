import "server-only";
import type { CurrentUser } from "@/app/_auth/session";
import { createCatalogDeps } from "@/infra/catalog";
import { withUser } from "@/infra/db/client";
import { createLibraryRepository } from "@/infra/db/library-repository";

// Dependências de `listRefsInLibrary`: o catálogo (sem segundo plano, só
// leitura) fora da transação do usuário e a biblioteca dentro dela, sob RLS.
export function libraryRefsDeps(user: CurrentUser) {
  return {
    catalog: createCatalogDeps(() => undefined),
    inLibrary: <T>(
      run: (deps: {
        library: ReturnType<typeof createLibraryRepository>;
      }) => Promise<T>,
    ) =>
      withUser(user.claims, (tx) =>
        run({ library: createLibraryRepository(tx) }),
      ),
  };
}
