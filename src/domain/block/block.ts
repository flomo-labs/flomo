import { blockInputSchema, unblockInputSchema } from "@/contracts/block";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { BlockDeps, BlockedPerson } from "./ports";

// Bloquear e desbloquear (Fase 2.1). Regras em docs/regras-de-negocio.md,
// seção Perfil e identidade (Bloqueio). O banco remove o vínculo de seguir nos
// dois sentidos ao bloquear e recusa novo vínculo enquanto o bloqueio durar; o
// caso de uso só valida a entrada e repassa.

export type BlockErrorCode =
  | "INVALID_INPUT"
  | "CANNOT_BLOCK_SELF"
  | "PROFILE_NOT_FOUND";

// Bloquear de novo quem já está bloqueado não é erro (duplo clique).
export async function blockUser(
  deps: BlockDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<
  Result<
    Record<string, never>,
    "INVALID_INPUT" | "CANNOT_BLOCK_SELF" | "PROFILE_NOT_FOUND"
  >
> {
  const parsed = blockInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Pessoa inválida.");
  const { profileId } = parsed.data;
  if (profileId === user.id) {
    return fail("CANNOT_BLOCK_SELF", "Você não pode bloquear a si mesmo.");
  }
  if ((await deps.blocks.insert(user.id, profileId)) === "not_found") {
    return fail("PROFILE_NOT_FOUND", "Perfil não encontrado.");
  }
  return ok({});
}

// Não falha se não havia bloqueio. Não restaura o vínculo de seguir: é preciso
// seguir de novo.
export async function unblockUser(
  deps: BlockDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<Record<string, never>, "INVALID_INPUT">> {
  const parsed = unblockInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Pessoa inválida.");
  await deps.blocks.delete(user.id, parsed.data.profileId);
  return ok({});
}

// Pessoas que o usuário logado bloqueou. Sem entrada: quem pergunta é sempre o
// usuário logado, e só vê os próprios bloqueios.
export async function listBlockedPeople(
  deps: BlockDeps,
  user: AuthenticatedUser,
): Promise<Result<{ people: BlockedPerson[] }, never>> {
  return ok({ people: await deps.blocks.list(user.id) });
}

// O usuário logado bloqueou esta pessoa? A tela do perfil usa para mostrar
// Desbloquear no lugar de Seguir.
export async function hasBlocked(
  deps: BlockDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<{ blocked: boolean }, "INVALID_INPUT">> {
  const parsed = blockInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Pessoa inválida.");
  return ok({
    blocked: await deps.blocks.exists(user.id, parsed.data.profileId),
  });
}
