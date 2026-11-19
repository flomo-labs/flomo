import "server-only";
import { cache } from "react";
import {
  listMyComments,
  listTitleComments,
  type CommentPage,
} from "@/domain/comment/comments";
import type { CommentLikes, CommentRecord } from "@/domain/comment/ports";
import { withUser } from "@/infra/db/client";
import { createCommentRepository } from "@/infra/db/comment-repository";
import { createLibraryRepository } from "@/infra/db/library-repository";
import { getCurrentUser } from "../_auth/session";

export type MyCommentsView =
  | { kind: "anonymous" }
  | { kind: "unavailable" }
  | { kind: "ok"; comments: (CommentRecord & CommentLikes)[] };

// Comentários do usuário no título, lidos uma vez por requisição.
export const getMyComments = cache(
  async (titleId: string): Promise<MyCommentsView> => {
    const user = await getCurrentUser();
    if (!user) return { kind: "anonymous" };
    try {
      const result = await withUser(user.claims, (tx) =>
        listMyComments(
          { comments: createCommentRepository(tx) },
          { id: user.id },
          { titleId },
        ),
      );
      return result.ok
        ? { kind: "ok", comments: result.value }
        : { kind: "unavailable" };
    } catch (error) {
      console.error("Falha ao ler os comentários:", error);
      return { kind: "unavailable" };
    }
  },
);

// Primeira página de comentários de outras pessoas no título (só os do próprio
// título; temporada e episódio são pedidos ao abrir). Número de comentários
// por página: o mesmo de "Carregar mais".
export const getOtherComments = cache(
  async (
    titleId: string,
    limit: number,
  ): Promise<{ kind: "ok"; page: CommentPage } | { kind: "unavailable" }> => {
    const user = await getCurrentUser();
    if (!user) return { kind: "unavailable" };
    try {
      const result = await withUser(user.claims, (tx) =>
        listTitleComments(
          {
            comments: createCommentRepository(tx),
            library: createLibraryRepository(tx),
          },
          { id: user.id },
          { titleId, limit },
        ),
      );
      return result.ok
        ? { kind: "ok", page: result.value }
        : { kind: "unavailable" };
    } catch (error) {
      console.error("Falha ao ler os comentários de outras pessoas:", error);
      return { kind: "unavailable" };
    }
  },
);

// Comentários do próprio usuário num alvo: o título (sem temporada nem
// episódio), uma temporada ou um episódio. `listMyComments` traz os de todos
// os alvos do título.
export function commentsFor<T extends CommentRecord>(
  all: T[],
  scope: { seasonId?: string; episodeId?: string },
): T[] {
  return all.filter((c) =>
    scope.episodeId
      ? c.episodeId === scope.episodeId
      : scope.seasonId
        ? c.seasonId === scope.seasonId
        : c.seasonId === null && c.episodeId === null,
  );
}
