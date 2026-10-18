import { and, desc, eq } from "drizzle-orm";
import type { ModerationStatus } from "@/contracts/comment";
import type { CommentRecord, CommentRepository } from "@/domain/comment/ports";
import type { Tx } from "./client";
import { comments } from "./schema";

function toRecord(row: typeof comments.$inferSelect): CommentRecord {
  return {
    id: row.id,
    titleId: row.titleId,
    body: row.body,
    containsSpoilers: row.containsSpoilers,
    // O CHECK da tabela só deixa passar os valores de ModerationStatus.
    moderationStatus: row.moderationStatus as ModerationStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Roda dentro do `withUser`: o RLS limita tudo aos comentários do usuário, e
// o filtro por `userId` só deixa a consulta explícita.
export function createCommentRepository(tx: Tx): CommentRepository {
  return {
    async insert(userId, titleId, body, containsSpoilers) {
      const [row] = await tx
        .insert(comments)
        .values({ userId, titleId, body, containsSpoilers })
        .returning();
      return toRecord(row);
    },
    async update(userId, commentId, body, containsSpoilers) {
      const [row] = await tx
        .update(comments)
        .set({ body, containsSpoilers })
        .where(and(eq(comments.id, commentId), eq(comments.userId, userId)))
        .returning();
      return row ? toRecord(row) : undefined;
    },
    async delete(userId, commentId) {
      await tx
        .delete(comments)
        .where(and(eq(comments.id, commentId), eq(comments.userId, userId)));
    },
    async listMine(userId, titleId) {
      const rows = await tx
        .select()
        .from(comments)
        .where(and(eq(comments.userId, userId), eq(comments.titleId, titleId)))
        .orderBy(desc(comments.createdAt), desc(comments.id));
      return rows.map(toRecord);
    },
  };
}
