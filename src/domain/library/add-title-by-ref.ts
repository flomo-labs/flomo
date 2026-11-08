import { addTitleByRefInputSchema } from "@/contracts/library";
import { ensureTitleByRef, type TitleErrorCode } from "../catalog/titles";
import type { CatalogDeps } from "../catalog/ports";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { LibraryDeps } from "./mark-watched";

// Guardar em "Quero ver" um título que veio de um resultado de busca e talvez
// ainda não esteja no catálogo local (atalho "+" da busca). Regras em
// docs/regras-de-negocio.md, seções Biblioteca e Catálogo.

export type AddByRefErrorCode = TitleErrorCode | "RATE_LIMITED";

export type AddByRefDeps = {
  catalog: CatalogDeps;
  // Roda a parte da biblioteca numa transação do usuário. Só abre depois de o
  // título estar no banco: a transação não espera a rede do provedor.
  inLibrary<T>(run: (deps: LibraryDeps) => Promise<T>): Promise<T>;
  // Limite de títulos novos trazidos do provedor por usuário. Títulos que já
  // estão no catálogo não gastam o limite.
  allowProviderFetch(userId: string): boolean;
};

export type AddByRefResult = {
  titleId: string;
  // `false` quando o título já estava na biblioteca: nada mudou (a situação
  // atual fica) e a tela não deve oferecer "Desfazer" que o removeria.
  added: boolean;
};

export async function addTitleToLibraryByRef(
  deps: AddByRefDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<AddByRefResult, AddByRefErrorCode>> {
  const parsed = addTitleByRefInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Dados inválidos.");
  const ref = parsed.data;

  // Título que ninguém abriu ainda: o provedor é chamado, e isso tem limite.
  const known = (await deps.catalog.store.findTitleByRef(ref)) !== null;
  if (!known && !deps.allowProviderFetch(user.id)) {
    return fail(
      "RATE_LIMITED",
      "Muitos títulos novos em pouco tempo. Tente de novo em instantes.",
    );
  }
  const ensured = await ensureTitleByRef(deps.catalog, ref);
  if (!ensured.ok) return ensured;

  const titleId = ensured.value;
  const added = await deps.inLibrary((library) =>
    library.library.addTitleIfAbsent(user.id, titleId, "watchlist"),
  );
  return ok({ titleId, added });
}
