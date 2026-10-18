"use server";

import { revalidatePath } from "next/cache";
import {
  createComment,
  deleteComment,
  updateComment,
  type CommentErrorCode,
} from "@/domain/comment/comments";
import { fail, type Result } from "@/domain/result";
import { withUser } from "@/infra/db/client";
import { createCommentRepository } from "@/infra/db/comment-repository";
import { createLibraryRepository } from "@/infra/db/library-repository";
import { getCurrentUser } from "../_auth/session";

// Camada fina (ADR-004): resolve o usuário, chama o caso de uso dentro do
// `withUser` (RLS) e atualiza a página do título. A regra fica em
// domain/comment/comments.ts. Cada ação confere o login por conta própria:
// Server Actions aceitam POST direto, não só os botões da tela.

export type CommentActionResult = Result<
  Record<string, never>,
  CommentErrorCode | "UNAUTHENTICATED"
>;

type UseCase = (
  deps: {
    comments: ReturnType<typeof createCommentRepository>;
    library: ReturnType<typeof createLibraryRepository>;
  },
  user: { id: string },
  input: unknown,
) => Promise<Result<unknown, CommentErrorCode>>;

async function run(
  useCase: UseCase,
  input: unknown,
): Promise<CommentActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return fail("UNAUTHENTICATED", "Sua sessão expirou. Entre de novo.");
  }
  const result = await withUser(user.claims, (tx) =>
    useCase(
      {
        comments: createCommentRepository(tx),
        library: createLibraryRepository(tx),
      },
      { id: user.id },
      input,
    ),
  );
  if (!result.ok) return result;
  revalidatePath("/titulo/[id]", "page");
  return { ok: true, value: {} };
}

export async function writeComment(input: unknown) {
  return run(createComment, input);
}

export async function editComment(input: unknown) {
  return run(updateComment, input);
}

export async function removeComment(input: unknown) {
  return run(deleteComment, input);
}
