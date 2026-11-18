import {
  type CommentListCursor,
  createCommentInputSchema,
  deleteCommentInputSchema,
  listMyCommentsInputSchema,
  listTitleCommentsInputSchema,
  updateCommentInputSchema,
} from "@/contracts/comment";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type {
  CommentDeps,
  CommentRecord,
  CommentScope,
  PublicComment,
} from "./ports";

// Escrever (no título, em temporada ou em episódio), editar, apagar e listar
// os próprios comentários (Fase 1.5) e ler os de outras pessoas (Fase 2.1b).
// Regras em docs/regras-de-negocio.md, seção Avaliações. Quem pode ler o quê é
// decisão do banco (RLS, migration 0032); aqui só se pede a lista.

export type CommentErrorCode =
  | "INVALID_INPUT"
  | "TITLE_NOT_FOUND"
  | "COMMENT_NOT_FOUND"
  | "TARGET_NOT_FOUND";

// As mensagens padrão do Zod são em inglês; só as nossas (texto vazio ou
// grande demais) chegam ao usuário.
function invalidInput(issues: { code: string; message: string }[]) {
  const custom = issues.find((i) => i.code === "custom");
  return fail("INVALID_INPUT" as const, custom?.message ?? "Dados inválidos.");
}

function scopeOf(input: {
  seasonId?: string;
  episodeId?: string;
}): CommentScope | null {
  if (input.episodeId) return { episodeId: input.episodeId };
  if (input.seasonId) return { seasonId: input.seasonId };
  return null;
}

// A temporada ou o episódio tem de existir e ser do título informado.
async function scopeBelongsToTitle(
  deps: Pick<CommentDeps, "comments">,
  scope: CommentScope,
  titleId: string,
) {
  return (await deps.comments.findScopeTitleId(scope)) === titleId;
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
  const scope = scopeOf(parsed.data);
  if (!(await deps.library.findTitleMediaType(titleId))) {
    return fail("TITLE_NOT_FOUND", "Título não encontrado.");
  }
  if (scope && !(await scopeBelongsToTitle(deps, scope, titleId))) {
    return fail("TARGET_NOT_FOUND", "Temporada ou episódio não encontrado.");
  }
  return ok(
    await deps.comments.insert(user.id, titleId, scope, body, containsSpoilers),
  );
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

export type CommentPage = {
  items: PublicComment[];
  // Cursor da próxima página; `null` quando não há mais.
  next: CommentListCursor | null;
};

// Comentários de outras pessoas num título, numa temporada ou num episódio
// (conforme `seasonId` e `episodeId`; sem eles, só os do próprio título). Só
// vem o que o usuário pode ler: o banco esconde perfil privado não seguido,
// bloqueio e comentário oculto ou removido; os do próprio usuário ficam de
// fora (ele já os vê em `listMyComments`).
export async function listTitleComments(
  deps: CommentDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<CommentPage, "INVALID_INPUT" | "TITLE_NOT_FOUND" | "TARGET_NOT_FOUND">> {
  const parsed = listTitleCommentsInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  const { titleId, limit, after } = parsed.data;
  const scope = scopeOf(parsed.data);
  if (!(await deps.library.findTitleMediaType(titleId))) {
    return fail("TITLE_NOT_FOUND", "Título não encontrado.");
  }
  if (scope && !(await scopeBelongsToTitle(deps, scope, titleId))) {
    return fail("TARGET_NOT_FOUND", "Temporada ou episódio não encontrado.");
  }
  // Pede um a mais para saber se há próxima página.
  const rows = await deps.comments.listOthers(
    user.id,
    titleId,
    scope,
    limit + 1,
    after,
  );
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return ok({
    items,
    next:
      rows.length > limit && last ? { at: last.cursorAt, id: last.id } : null,
  });
}
