import {
  removeTitleInputSchema,
  setTitleHiddenInputSchema,
  setTitleStatusInputSchema,
} from "@/contracts/library";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { LibraryDeps } from "./mark-watched";

// Colocar o título na biblioteca sem marcar nada, mudar a situação e tirá-lo
// (Fase 1.4). Regras em docs/regras-de-negocio.md, seção Biblioteca.

export type SetStatusErrorCode =
  | "INVALID_INPUT"
  | "TITLE_NOT_FOUND"
  | "NOT_IN_LIBRARY";

export async function setTitleStatus(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<Record<string, never>, SetStatusErrorCode>> {
  const parsed = setTitleStatusInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Dados inválidos.");
  const { titleId, status } = parsed.data;
  if (!(await deps.library.findTitleMediaType(titleId))) {
    return fail("TITLE_NOT_FOUND", "Título não encontrado.");
  }
  await deps.library.setTitleStatus(user.id, titleId, status);
  return ok({});
}

// Ocultar não muda a situação nem o que foi marcado; só tira o título das
// listas, que o mostram na aba "Ocultos".
export async function setTitleHidden(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<Record<string, never>, SetStatusErrorCode>> {
  const parsed = setTitleHiddenInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Dados inválidos.");
  const { titleId, hidden } = parsed.data;
  if (!(await deps.library.setTitleHidden(user.id, titleId, hidden))) {
    return fail("NOT_IN_LIBRARY", "Adicione o título à biblioteca primeiro.");
  }
  return ok({});
}

export async function removeTitleFromLibrary(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<Record<string, never>, SetStatusErrorCode>> {
  const parsed = removeTitleInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Dados inválidos.");
  await deps.library.removeTitle(user.id, parsed.data.titleId);
  return ok({});
}
