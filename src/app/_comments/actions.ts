"use server";

import { revalidatePath } from "next/cache";
import {
  createComment,
  deleteComment,
  likeComment,
  listTitleComments,
  unlikeComment,
  updateComment,
  type CommentErrorCode,
  type CommentPage,
} from "@/domain/comment/comments";
import type { CommentLikes } from "@/domain/comment/ports";
import { fail, type Result } from "@/domain/result";
import { withUser } from "@/infra/db/client";
import { createCommentRepository } from "@/infra/db/comment-repository";
import { createLibraryRepository } from "@/infra/db/library-repository";
import { createRateLimiter } from "@/lib/rate-limit";
import { getCurrentUser } from "../_auth/session";

// Camada fina (ADR-004): resolve o usuário, chama o caso de uso dentro do
// `withUser` (RLS) e atualiza a página do título. A regra fica em
// domain/comment/comments.ts. Cada ação confere o login por conta própria:
// Server Actions aceitam POST direto, não só os botões da tela.

export type CommentActionResult = Result<
  Record<string, never>,
  CommentErrorCode | "UNAUTHENTICATED"
>;

// Freios por usuário (#405) nas ações de curtir e de ler comentários: cada
// chamada abre transação, confere permissão e lê a contagem, então um laço de
// um cliente logado gera carga no banco. O uso normal fica longe dos limites.
// Contam na memória de cada instância, como os das sugestões da busca e da
// rolagem de pessoas (src/lib/rate-limit.ts), então são um freio parcial.
// Curtir e descurtir dividem o mesmo contador, para alternar não burlar o limite.
const checkLikeRate = createRateLimiter({
  limit: 30,
  windowMs: 60_000,
  maxKeys: 5000,
});
const checkLoadCommentsRate = createRateLimiter({
  limit: 60,
  windowMs: 60_000,
  maxKeys: 5000,
});

const RATE_LIMITED_MESSAGE = "Muitas requisições. Tente de novo em instantes.";

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

// Leitura dos comentários de outras pessoas (um título, uma temporada ou um
// episódio, em páginas). Não revalida página nenhuma.
export async function loadTitleComments(
  input: unknown,
): Promise<
  Result<CommentPage, CommentErrorCode | "UNAUTHENTICATED" | "RATE_LIMITED">
> {
  const user = await getCurrentUser();
  if (!user) {
    return fail("UNAUTHENTICATED", "Sua sessão expirou. Entre de novo.");
  }
  if (!checkLoadCommentsRate(user.id, Date.now()).allowed) {
    return fail("RATE_LIMITED", RATE_LIMITED_MESSAGE);
  }
  return withUser(user.claims, (tx) =>
    listTitleComments(
      {
        comments: createCommentRepository(tx),
        library: createLibraryRepository(tx),
      },
      { id: user.id },
      input,
    ),
  );
}

export type CommentLikeResult = Result<
  CommentLikes,
  CommentErrorCode | "UNAUTHENTICATED" | "RATE_LIMITED"
>;

// Curtir e descurtir (#397). Devolvem a contagem atual para a tela se acertar
// com o servidor. Não revalidam a página: a contagem fica no componente e
// recarregar a página lê de novo.
async function runLike(
  useCase: (
    deps: { comments: ReturnType<typeof createCommentRepository> },
    user: { id: string },
    input: unknown,
  ) => Promise<Result<CommentLikes, CommentErrorCode>>,
  input: unknown,
): Promise<CommentLikeResult> {
  const user = await getCurrentUser();
  if (!user) {
    return fail("UNAUTHENTICATED", "Sua sessão expirou. Entre de novo.");
  }
  if (!checkLikeRate(user.id, Date.now()).allowed) {
    return fail("RATE_LIMITED", RATE_LIMITED_MESSAGE);
  }
  return withUser(user.claims, (tx) =>
    useCase({ comments: createCommentRepository(tx) }, { id: user.id }, input),
  );
}

export async function addCommentLike(input: unknown) {
  return runLike(likeComment, input);
}

export async function removeCommentLike(input: unknown) {
  return runLike(unlikeComment, input);
}
