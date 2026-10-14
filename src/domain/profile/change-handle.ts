import { changeHandleInputSchema, normalizeHandle } from "@/contracts/profile";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { ProfileRepository } from "./ports";

export type ChangeHandleErrorCode =
  | "INVALID_INPUT"
  | "HANDLE_TAKEN"
  | "PROFILE_NOT_FOUND";

const HANDLE_TAKEN_MESSAGE = "Este nome de usuário já está em uso.";

// Escolha do handle definitivo (primeiro acesso) e troca a qualquer momento:
// é a mesma regra (ADR-003, seção 6). O dono pode trocar entre variações do
// próprio handle (`renato.silva` -> `renato_silva`), por isso a checagem
// desconsidera o próprio perfil.
export async function changeHandle(
  deps: { profiles: ProfileRepository },
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<{ handle: string }, ChangeHandleErrorCode>> {
  const parsed = changeHandleInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT", parsed.error.issues[0].message);
  }
  const { handle } = parsed.data;

  if (await deps.profiles.isHandleTaken(normalizeHandle(handle), user.id)) {
    return fail("HANDLE_TAKEN", HANDLE_TAKEN_MESSAGE);
  }

  // Dois pedidos simultâneos podem passar pela checagem acima; o índice
  // único do banco decide, e o perdedor recebe "taken".
  const outcome = await deps.profiles.updateHandle(user.id, handle);
  if (outcome === "taken") {
    return fail("HANDLE_TAKEN", HANDLE_TAKEN_MESSAGE);
  }
  if (outcome === "not_found") {
    return fail("PROFILE_NOT_FOUND", "Perfil não encontrado.");
  }
  return ok({ handle });
}
