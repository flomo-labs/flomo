import "server-only";
import { cache } from "react";
import { listMyComments } from "@/domain/comment/comments";
import type { CommentRecord } from "@/domain/comment/ports";
import { withUser } from "@/infra/db/client";
import { createCommentRepository } from "@/infra/db/comment-repository";
import { getCurrentUser } from "../_auth/session";

export type MyCommentsView =
  | { kind: "anonymous" }
  | { kind: "unavailable" }
  | { kind: "ok"; comments: CommentRecord[] };

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
