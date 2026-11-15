"use server";

import { revalidatePath } from "next/cache";
import {
  acceptFollowRequest,
  declineFollowRequest,
  followUser,
  listFollowRequests,
  removeFollower,
  unfollowUser,
  type FollowErrorCode,
} from "@/domain/follow/follow";
import { loadMorePeopleInputSchema } from "@/contracts/follow";
import { fail, ok, type Result } from "@/domain/result";
import { withUser } from "@/infra/db/client";
import { createFollowRepository } from "@/infra/db/follow-repository";
import { getCurrentUser } from "../_auth/session";
import { loadFollowList } from "./queries";

// Camada fina (ADR-004): resolve o usuário, chama o caso de uso dentro do
// `withUser` (RLS) e atualiza a página do perfil. A regra fica em
// domain/follow/follow.ts. Cada ação confere o login por conta própria:
// Server Actions aceitam POST direto, não só os botões da tela.

export type FollowActionResult<T = Record<string, never>> = Result<
  T,
  FollowErrorCode | "UNAUTHENTICATED"
>;

type UseCase<T> = (
  deps: { follows: ReturnType<typeof createFollowRepository> },
  user: { id: string },
  input: unknown,
) => Promise<Result<T, FollowErrorCode>>;

async function run<T>(
  useCase: UseCase<T>,
  input: unknown,
  { revalidate = true }: { revalidate?: boolean } = {},
): Promise<FollowActionResult<T>> {
  const user = await getCurrentUser();
  if (!user) {
    return fail("UNAUTHENTICATED", "Sua sessão expirou. Entre de novo.");
  }
  const result = await withUser(user.claims, (tx) =>
    useCase({ follows: createFollowRepository(tx) }, { id: user.id }, input),
  );
  if (result.ok && revalidate) revalidatePath("/perfil/[handle]", "page");
  return result;
}

export async function follow(input: unknown) {
  return run(followUser, input);
}

export async function unfollow(input: unknown) {
  return run(unfollowUser, input);
}

export async function acceptRequest(input: unknown) {
  return run(acceptFollowRequest, input);
}

export async function declineRequest(input: unknown) {
  return run(declineFollowRequest, input);
}

export async function removeFollowerAction(input: unknown) {
  const result = await run(removeFollower, input);
  // As listas do dono e de quem deixou de seguir também mudam.
  if (result.ok) {
    revalidatePath("/perfil/[handle]/seguidores", "page");
    revalidatePath("/perfil/[handle]/seguindo", "page");
  }
  return result;
}

// Leitura: não muda nada, então não revalida a página.
export async function listRequests() {
  return run((deps, user) => listFollowRequests(deps, user), undefined, {
    revalidate: false,
  });
}

// Próximo trecho das listas de seguidores e de seguindo, chamado pela rolagem
// infinita. Quem pode ver a lista é decidido pelo banco (RLS), como na página.
export async function loadMorePeople(input: unknown) {
  const user = await getCurrentUser();
  if (!user) {
    return fail("UNAUTHENTICATED", "Sua sessão expirou. Entre de novo.");
  }
  const parsed = loadMorePeopleInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Pedido inválido.");
  const { profileId, kind, offset } = parsed.data;
  return ok(await loadFollowList(user, profileId, kind, offset));
}
