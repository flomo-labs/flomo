import {
  createCommentInputSchema,
  deleteCommentInputSchema,
  listMyCommentsInputSchema,
  updateCommentInputSchema,
} from "@/contracts/comment";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { CommentDeps, CommentRecord } from "./ports";

// Escrever, editar, apagar e listar os próprios comentários (Fase 1.5).
// Regras em docs/regras-de-negocio.md, seção Avaliações. A leitura dos
// comentários de outras pessoas vem com o perfil público (Fase 2.1).

export type CommentErrorCode =
  | "INVALID_INPUT"
  | "TITLE_NOT_FOUND"
  | "COMMENT_NOT_FOUND";

// As mensagens padrão do Zod são em inglês; só as nossas (texto vazio ou
// grande demais) chegam ao usuário.
function invalidInput(issues: { code: string; message: string }[]) {
  const custom = issues.find((i) => i.code === "custom");
  return fail("INVALID_INPUT" as const, custom?.message ?? "Dados inválidos.");
}

// Qualquer usuário logado comenta, tenha assistido ou não.
export async function createComment(
  deps: CommentDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<CommentRecord, CommentErrorCode>> {
  const parsed = createCommentInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  const { titleId, body, containsSpoilers } = parsed.data;
  if (!(await deps.library.findTitleMediaType(titleId))) {
    return fail("TITLE_NOT_FOUND", "Título não encontrado.");
  }
  return ok(await deps.comments.insert(user.id, titleId, body, containsSpoilers));
}

// Edita o texto e o aviso de spoiler do próprio comentário.
export async function updateComment(
  deps: Pick<CommentDeps, "comments">,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<CommentRecord, CommentErrorCode>> {
  const parsed = updateCommentInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  const { commentId, body, containsSpoilers } = parsed.data;
  const updated = await deps.comments.update(
    user.id,
    commentId,
    body,
    containsSpoilers,
  );
  if (!updated) return fail("COMMENT_NOT_FOUND", "Comentário não encontrado.");
  return ok(updated);
}

// Apagar não falha se o comentário já não existe ou é de outra pessoa.
export async function deleteComment(
  deps: Pick<CommentDeps, "comments">,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<Record<string, never>, "INVALID_INPUT">> {
  const parsed = deleteCommentInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Dados inválidos.");
  await deps.comments.delete(user.id, parsed.data.commentId);
  return ok({});
}

export async function listMyComments(
  deps: Pick<CommentDeps, "comments">,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<CommentRecord[], "INVALID_INPUT">> {
  const parsed = listMyCommentsInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Título inválido.");
  return ok(await deps.comments.listMine(user.id, parsed.data.titleId));
}
