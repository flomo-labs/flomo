"use server";

import { revalidatePath } from "next/cache";
import {
  acceptFollowRequest,
  declineFollowRequest,
  followUser,
  unfollowUser,
  type FollowErrorCode,
} from "@/domain/follow/follow";
import { fail, type Result } from "@/domain/result";
import { withUser } from "@/infra/db/client";
import { createFollowRepository } from "@/infra/db/follow-repository";
import { getCurrentUser } from "../_auth/session";

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
): Promise<FollowActionResult<T>> {
  const user = await getCurrentUser();
  if (!user) {
    return fail("UNAUTHENTICATED", "Sua sessão expirou. Entre de novo.");
  }
  const result = await withUser(user.claims, (tx) =>
    useCase({ follows: createFollowRepository(tx) }, { id: user.id }, input),
  );
  if (result.ok) revalidatePath("/perfil/[handle]", "page");
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
