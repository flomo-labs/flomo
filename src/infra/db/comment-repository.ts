import { and, desc, eq, ne, notExists, sql } from "drizzle-orm";
import type { ModerationStatus } from "@/contracts/comment";
import type {
  CommentAuthor,
  CommentLikes,
  CommentRecord,
  CommentRepository,
} from "@/domain/comment/ports";
import type { Tx } from "./client";
import { blocks, commentLikes, comments, episodes, seasons } from "./schema";

function toRecord(row: typeof comments.$inferSelect): CommentRecord {
  return {
    id: row.id,
    titleId: row.titleId,
    seasonId: row.seasonId,
    episodeId: row.episodeId,
    body: row.body,
    containsSpoilers: row.containsSpoilers,
    // O CHECK da tabela só deixa passar os valores de ModerationStatus.
    moderationStatus: row.moderationStatus as ModerationStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Roda dentro do `withUser`. Escrever e apagar é só nos próprios comentários
// (RLS), mas desde a migration 0032 ler também alcança os publicados de
// outras pessoas: o filtro por `userId` é obrigatório nas consultas "meus".
export function createCommentRepository(tx: Tx): CommentRepository {
  // Pela função `app.comment_like_summaries` (migration 0036): a policy de
  // `comment_likes` só mostra as curtidas do próprio usuário, e a função já
  // deixa de fora o comentário que ele não pode ler.
  async function likeSummaries(
    commentIds: string[],
  ): Promise<Map<string, CommentLikes>> {
    const map = new Map<string, CommentLikes>();
    if (commentIds.length === 0) return map;
    const found = await tx.execute<{
      comment_id: string;
      like_count: number;
      liked_by_me: boolean;
    }>(
      sql`select comment_id, like_count, liked_by_me from app.comment_like_summaries(array[${sql.join(
        commentIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )}])`,
    );
    for (const r of found) {
      map.set(r.comment_id, {
        likeCount: r.like_count,
        likedByMe: r.liked_by_me,
      });
    }
    return map;
  }

  const noLikes: CommentLikes = { likeCount: 0, likedByMe: false };

  return {
    async like(userId, commentId) {
      // `app.can_like_comment` é a mesma regra da policy de insert; checar antes
      // devolve "não pode" sem depender de erro 42501. A policy segue como
      // defesa em dupla.
      const allowed = await tx.execute<{ ok: boolean }>(
        sql`select app.can_like_comment(${commentId}::uuid) as ok`,
      );
      if (!allowed[0]?.ok) return undefined;
      // Se o comentário sumiu ou mudou de estado entre a checagem e o insert
      // (apagado, moderado, bloqueio novo), o banco recusa com 23503 (FK) ou
      // 42501 (policy): é "não pode curtir", não erro. Num savepoint, para o
      // erro não abortar a transação do chamador.
      try {
        await tx.transaction((sp) =>
          sp
            .insert(commentLikes)
            .values({ commentId, userId })
            .onConflictDoNothing(),
        );
      } catch (error) {
        const code = (error as { cause?: { code?: string } }).cause?.code;
        if (code === "23503" || code === "42501") return undefined;
        throw error;
      }
      return (await likeSummaries([commentId])).get(commentId) ?? noLikes;
    },
    async unlike(userId, commentId) {
      await tx
        .delete(commentLikes)
        .where(
          and(
            eq(commentLikes.commentId, commentId),
            eq(commentLikes.userId, userId),
          ),
        );
      return (await likeSummaries([commentId])).get(commentId) ?? noLikes;
    },
    async insert(userId, titleId, scope, body, containsSpoilers) {
      // O trigger da 0032 acerta `title_id` pelo alvo; aqui já vem o certo.
      const [row] = await tx
        .insert(comments)
        .values({
          userId,
          titleId,
          seasonId: scope && "seasonId" in scope ? scope.seasonId : null,
          episodeId: scope && "episodeId" in scope ? scope.episodeId : null,
          body,
          containsSpoilers,
        })
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
      const likes = await likeSummaries(rows.map((r) => r.id));
      return rows.map((r) => ({
        ...toRecord(r),
        ...(likes.get(r.id) ?? noLikes),
      }));
    },
    async findScopeTitleId(scope) {
      if ("seasonId" in scope) {
        const [row] = await tx
          .select({ titleId: seasons.titleId })
          .from(seasons)
          .where(eq(seasons.id, scope.seasonId));
        return row?.titleId;
      }
      const [row] = await tx
        .select({ titleId: seasons.titleId })
        .from(episodes)
        .innerJoin(seasons, eq(seasons.id, episodes.seasonId))
        .where(eq(episodes.id, scope.episodeId));
      return row?.titleId;
    },
    // O RLS já limita a perfil visível e comentário publicado; os filtros
    // abaixo repetem o publicado de propósito (defesa em dupla). Nome e foto
    // vêm de `app.comment_authors` (migration 0033), que libera também o autor
    // de perfil privado seguido; sem linha lá, `author` fica nulo.
    async listOthers(viewerId, titleId, scope, limit, after) {
      const cursorAt = sql<string>`to_char(${comments.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
      const target = !scope
        ? sql`${comments.seasonId} is null and ${comments.episodeId} is null`
        : "seasonId" in scope
          ? eq(comments.seasonId, scope.seasonId)
          : eq(comments.episodeId, scope.episodeId);
      const rows = await tx
        .select({
          comment: comments,
          cursorAt,
        })
        .from(comments)
        .where(
          and(
            eq(comments.titleId, titleId),
            target,
            ne(comments.userId, viewerId),
            // Bloqueio nos dois sentidos: quem o viewer bloqueou
            // não aparece (a 0032 já esconde quem bloqueou o viewer).
            notExists(
              tx
                .select({ one: sql`1` })
                .from(blocks)
                .where(
                  and(
                    eq(blocks.blockerId, viewerId),
                    eq(blocks.blockedId, comments.userId),
                  ),
                ),
            ),
            eq(comments.moderationStatus, "published"),
            after
              ? sql`(${comments.createdAt}, ${comments.id}) < (${after.at}::timestamptz, ${after.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(comments.createdAt), desc(comments.id))
        .limit(limit);
      const authorIds = [...new Set(rows.map((r) => r.comment.userId))];
      const authors = new Map<string, CommentAuthor>();
      if (authorIds.length > 0) {
        const found = await tx.execute<{
          id: string;
          handle: string;
          display_name: string | null;
          avatar_url: string | null;
        }>(
          sql`select id, handle, display_name, avatar_url from app.comment_authors(array[${sql.join(
            authorIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )}])`,
        );
        for (const a of found) {
          authors.set(a.id, {
            id: a.id,
            handle: a.handle,
            displayName: a.display_name,
            avatarUrl: a.avatar_url,
          });
        }
      }
      const likes = await likeSummaries(rows.map((r) => r.comment.id));
      return rows.map((r) => {
        const { moderationStatus, ...record } = toRecord(r.comment);
        void moderationStatus;
        return {
          ...record,
          ...(likes.get(r.comment.id) ?? noLikes),
          author: authors.get(r.comment.userId) ?? null,
          cursorAt: r.cursorAt,
        };
      });
    },
  };
}
