import { titleLibraryStateInputSchema } from "@/contracts/library";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { LibraryDeps } from "./mark-watched";
import type { TitleLibraryState } from "./ports";

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
