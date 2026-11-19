import { and, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import {
  blocks,
  commentLikes,
  comments,
  follows,
  profiles,
  titles,
} from "./schema";

// Exercita a migration 0036: curtidas nos comentários (tabela, policies e as
// funções app.can_like_comment e app.comment_like_summaries).
afterAll(closeTestDb);

const INSUFFICIENT_PRIVILEGE = "42501";

function pgError(code: string) {
  return expect.objectContaining({
    cause: expect.objectContaining({ code }),
  });
}

async function person(tx: Tx, isPrivate: boolean) {
  const id = await createUser(tx, { full_name: "Pessoa de Teste" });
  await tx
    .update(profiles)
    .set({ handle: `t${id.replaceAll("-", "").slice(0, 12)}`, isPrivate })
    .where(eq(profiles.id, id));
  return id;
}

async function scene(tx: Tx, authorPrivate = false) {
  const author = await person(tx, authorPrivate);
  const [title] = await tx
    .insert(titles)
    .values({ mediaType: "movie", originalTitle: "Filme" })
    .returning({ id: titles.id });
  const [row] = await tx
    .insert(comments)
    .values({ userId: author, titleId: title.id, body: "oi" })
    .returning({ id: comments.id });
  return { author, commentId: row.id };
}

type Likes = { likeCount: number; likedByMe: boolean };

// Contagem e "eu curti" pela função da migration; zerado se o comentário não é
// legível para quem pergunta.
async function summary(t: Tx, commentId: string): Promise<Likes> {
  const rows = await t.execute<{ like_count: number; liked_by_me: boolean }>(
    sql`select like_count, liked_by_me from app.comment_like_summaries(array[${commentId}::uuid])`,
  );
  return rows[0]
    ? { likeCount: rows[0].like_count, likedByMe: rows[0].liked_by_me }
    : { likeCount: 0, likedByMe: false };
}

// `undefined` quando a regra (app.can_like_comment) não deixa curtir.
const like = (tx: Tx, userId: string, commentId: string) =>
  asUser(tx, userId, async (t): Promise<Likes | undefined> => {
    const [allowed] = await t.execute<{ ok: boolean }>(
      sql`select app.can_like_comment(${commentId}::uuid) as ok`,
    );
    if (!allowed?.ok) return undefined;
    await t
      .insert(commentLikes)
      .values({ commentId, userId })
      .onConflictDoNothing();
    return summary(t, commentId);
  });

const unlike = (tx: Tx, userId: string, commentId: string) =>
  asUser(tx, userId, async (t) => {
    await t
      .delete(commentLikes)
      .where(
        and(
          eq(commentLikes.commentId, commentId),
          eq(commentLikes.userId, userId),
        ),
      );
    return summary(t, commentId);
  });

describe("curtidas nos comentários (migration 0036)", () => {
  it("curte, conta de todos, curtir de novo não duplica e descurtir apaga só a própria", () =>
    inRollback(async (tx) => {
      const { commentId } = await scene(tx);
      const a = await person(tx, false);
      const b = await person(tx, false);
      expect(await like(tx, a, commentId)).toEqual({
        likeCount: 1,
        likedByMe: true,
      });
      expect(await like(tx, a, commentId)).toEqual({
        likeCount: 1,
        likedByMe: true,
      });
      expect(await like(tx, b, commentId)).toEqual({
        likeCount: 2,
        likedByMe: true,
      });
      expect(await unlike(tx, a, commentId)).toEqual({
        likeCount: 1,
        likedByMe: false,
      });
      expect(await unlike(tx, a, commentId)).toEqual({
        likeCount: 1,
        likedByMe: false,
      });
    }));

  it("o autor pode curtir o próprio comentário", () =>
    inRollback(async (tx) => {
      const { author, commentId } = await scene(tx);
      expect(await like(tx, author, commentId)).toEqual({
        likeCount: 1,
        likedByMe: true,
      });
    }));

  it("perfil privado: só quem segue com solicitação aceita curte; os demais recebem 'não pode'", () =>
    inRollback(async (tx) => {
      const { author, commentId } = await scene(tx, true);
      const accepted = await person(tx, false);
      const pending = await person(tx, false);
      const stranger = await person(tx, false);
      await tx.insert(follows).values([
        { followerId: accepted, followeeId: author },
        { followerId: pending, followeeId: author },
      ]);
      await tx
        .update(follows)
        .set({ status: "accepted" })
        .where(eq(follows.followerId, accepted));
      expect(await like(tx, accepted, commentId)).toMatchObject({
        likeCount: 1,
      });
      expect(await like(tx, pending, commentId)).toBeUndefined();
      expect(await like(tx, stranger, commentId)).toBeUndefined();
    }));

  it("bloqueio nos dois sentidos impede curtir; curtida antiga fica e a contagem segue total", () =>
    inRollback(async (tx) => {
      const { author, commentId } = await scene(tx);
      const viewer = await person(tx, false);
      const other = await person(tx, false);
      expect(await like(tx, viewer, commentId)).toMatchObject({ likeCount: 1 });
      expect(await like(tx, other, commentId)).toMatchObject({ likeCount: 2 });
      // O viewer bloqueia o autor: não curte mais, mas a curtida antiga fica.
      await tx.insert(blocks).values({ blockerId: viewer, blockedId: author });
      expect(await unlike(tx, other, commentId)).toMatchObject({
        likeCount: 1,
      });
      expect(await like(tx, other, commentId)).toMatchObject({ likeCount: 2 });
      expect(await like(tx, viewer, commentId)).toBeUndefined();
      // O autor bloqueia `other`: `other` não lê mais o comentário.
      await tx.insert(blocks).values({ blockerId: author, blockedId: other });
      expect(await like(tx, other, commentId)).toBeUndefined();
      expect(await unlike(tx, other, commentId)).toEqual({
        likeCount: 0,
        likedByMe: false,
      });
    }));

  it("comentário oculto pela plataforma não recebe curtida nem mostra contagem", () =>
    inRollback(async (tx) => {
      const { commentId } = await scene(tx);
      const viewer = await person(tx, false);
      expect(await like(tx, viewer, commentId)).toMatchObject({ likeCount: 1 });
      await tx
        .update(comments)
        .set({ moderationStatus: "hidden" })
        .where(eq(comments.id, commentId));
      expect(await like(tx, viewer, commentId)).toBeUndefined();
    }));

  it("a policy também barra o insert direto sem permissão e o insert em nome de outra pessoa", () =>
    inRollback(async (tx) => {
      const { commentId } = await scene(tx, true);
      const stranger = await person(tx, false);
      const victim = await person(tx, false);
      await expect(
        asUser(tx, stranger, (t) =>
          t.transaction((sp) =>
            sp.insert(commentLikes).values({ commentId, userId: stranger }),
          ),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
      await expect(
        asUser(tx, stranger, (t) =>
          t.transaction((sp) =>
            sp.insert(commentLikes).values({ commentId, userId: victim }),
          ),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("cada pessoa só enxerga e apaga as próprias linhas; anônimo não toca", () =>
    inRollback(async (tx) => {
      const { commentId } = await scene(tx);
      const a = await person(tx, false);
      const b = await person(tx, false);
      await like(tx, a, commentId);
      await like(tx, b, commentId);
      const rowsSeenByB = await asUser(tx, b, (t) =>
        t
          .select({ userId: commentLikes.userId })
          .from(commentLikes)
          .where(eq(commentLikes.commentId, commentId)),
      );
      expect(rowsSeenByB).toEqual([{ userId: b }]);
      await asUser(tx, b, (t) =>
        t
          .delete(commentLikes)
          .where(
            and(
              eq(commentLikes.commentId, commentId),
              eq(commentLikes.userId, a),
            ),
          ),
      );
      expect(await unlike(tx, a, commentId)).toMatchObject({ likeCount: 1 });
      await expect(
        tx.transaction(async (sp) => {
          await sp.execute(sql`set local role anon`);
          await sp.select().from(commentLikes);
        }),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("apagar o comentário apaga as curtidas em cascata", () =>
    inRollback(async (tx) => {
      const { commentId } = await scene(tx);
      const a = await person(tx, false);
      await like(tx, a, commentId);
      await tx.delete(comments).where(eq(comments.id, commentId));
      const left = await tx
        .select()
        .from(commentLikes)
        .where(eq(commentLikes.commentId, commentId));
      expect(left).toEqual([]);
    }));
});
