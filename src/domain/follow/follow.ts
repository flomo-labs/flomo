import {
  acceptFollowInputSchema,
  declineFollowInputSchema,
  followInputSchema,
  unfollowInputSchema,
  type FollowStatus,
} from "@/contracts/follow";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { FollowDeps, PendingFollowRequest } from "./ports";

// Seguir, deixar de seguir, aceitar e recusar (Fase 2.1). Regras em
// docs/regras-de-negocio.md, seção Perfil e identidade (Seguidores). Perfil
// público é seguido direto; perfil privado recebe uma solicitação. Quem decide
// o estado é o banco (gatilho), então o caso de uso só repassa o que voltou.

export type FollowErrorCode =
  | "INVALID_INPUT"
  | "CANNOT_FOLLOW_SELF"
  | "PROFILE_NOT_FOUND"
  | "REQUEST_NOT_FOUND";

// Seguir de novo quem já se segue (ou já se pediu) devolve o estado atual: o
// duplo clique não vira erro nem cria outra linha.
export async function followUser(
  deps: FollowDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<
  Result<
    { status: FollowStatus },
    "INVALID_INPUT" | "CANNOT_FOLLOW_SELF" | "PROFILE_NOT_FOUND"
  >
> {
  const parsed = followInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Pessoa inválida.");
  const { profileId } = parsed.data;
  if (profileId === user.id) {
    return fail("CANNOT_FOLLOW_SELF", "Você não pode seguir a si mesmo.");
  }
  const created = await deps.follows.insert(user.id, profileId);
  if (created === "not_found") {
    return fail("PROFILE_NOT_FOUND", "Perfil não encontrado.");
  }
  return ok(created);
}

// Também cancela a solicitação pendente. Não falha se não havia vínculo.
export async function unfollowUser(
  deps: FollowDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<Record<string, never>, "INVALID_INPUT">> {
  const parsed = unfollowInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Pessoa inválida.");
  await deps.follows.delete(user.id, parsed.data.profileId);
  return ok({});
}

// Só o dono (o seguido) aceita as solicitações que chegaram a ele.
export async function acceptFollowRequest(
  deps: FollowDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<
  Result<Record<string, never>, "INVALID_INPUT" | "REQUEST_NOT_FOUND">
> {
  const parsed = acceptFollowInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Pessoa inválida.");
  if (!(await deps.follows.accept(user.id, parsed.data.followerId))) {
    return fail("REQUEST_NOT_FOUND", "Solicitação não encontrada.");
  }
  return ok({});
}

// Recusar apaga a solicitação; quem pediu continua sem ver o perfil e pode
// pedir de novo. Não falha se a solicitação já não existe.
export async function declineFollowRequest(
  deps: FollowDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<Record<string, never>, "INVALID_INPUT">> {
  const parsed = declineFollowInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Pessoa inválida.");
  await deps.follows.decline(user.id, parsed.data.followerId);
  return ok({});
}

// Lista, para o dono, as solicitações de seguir que esperam resposta. Sem
// entrada: quem pergunta é sempre o usuário logado, e só vê as próprias.
export async function listFollowRequests(
  deps: FollowDeps,
  user: AuthenticatedUser,
): Promise<Result<{ requests: PendingFollowRequest[] }, never>> {
  return ok({ requests: await deps.follows.listPending(user.id) });
}
