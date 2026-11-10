"use server";

import { revalidatePath } from "next/cache";
import {
  blockUser,
  unblockUser,
  type BlockErrorCode,
} from "@/domain/block/block";
import { fail, type Result } from "@/domain/result";
import { withUser } from "@/infra/db/client";
import { createBlockRepository } from "@/infra/db/block-repository";
import { getCurrentUser } from "../_auth/session";

// Camada fina (ADR-004): resolve o usuário, chama o caso de uso dentro do
// `withUser` (RLS) e atualiza as telas que mostram o bloqueio. A regra fica em
// domain/block/block.ts. Cada ação confere o login por conta própria: Server
// Actions aceitam POST direto, não só os botões da tela.

export type BlockActionResult = Result<
  Record<string, never>,
  BlockErrorCode | "UNAUTHENTICATED"
>;

type UseCase = (
  deps: { blocks: ReturnType<typeof createBlockRepository> },
  user: { id: string },
  input: unknown,
) => Promise<Result<Record<string, never>, BlockErrorCode>>;

async function run(
  useCase: UseCase,
  input: unknown,
): Promise<BlockActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return fail("UNAUTHENTICATED", "Sua sessão expirou. Entre de novo.");
  }
  const result = await withUser(user.claims, (tx) =>
    useCase({ blocks: createBlockRepository(tx) }, { id: user.id }, input),
  );
  if (result.ok) {
    revalidatePath("/perfil/[handle]", "page");
    revalidatePath("/configuracoes");
  }
  return result;
}

export async function block(input: unknown) {
  return run(blockUser, input);
}

export async function unblock(input: unknown) {
  return run(unblockUser, input);
}
