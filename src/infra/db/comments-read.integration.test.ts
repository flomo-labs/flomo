import { eq, sql } from "drizzle-orm";
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
  comments,
  episodes,
  follows,
  profiles,
  seasons,
  titles,
} from "./schema";

// Exercita a migration 0032: leitura de comentários de outras pessoas
// (perfil privado, bloqueio e comentário oculto) e season_id/episode_id.
afterAll(closeTestDb);

const CHECK_VIOLATION = "23514";
const INSUFFICIENT_PRIVILEGE = "42501";
const FOREIGN_KEY_VIOLATION = "23503";

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

async function catalog(tx: Tx) {
  const [series] = await tx
    .insert(titles)
    .values({ mediaType: "tv", originalTitle: "Série" })
    .returning({ id: titles.id });
  const [other] = await tx
    .insert(titles)
    .values({ mediaType: "movie", originalTitle: "Outro" })
    .returning({ id: titles.id });
  const [season] = await tx
    .insert(seasons)
    .values({ titleId: series.id, seasonNumber: 1 })
    .returning({ id: seasons.id });
  const [episode] = await tx
    .insert(episodes)
    .values({ seasonId: season.id, episodeNumber: 1 })
    .returning({ id: episodes.id });
  return {
    titleId: series.id,
    otherTitleId: other.id,
    seasonId: season.id,
    episodeId: episode.id,
  };
}

// Um comentário do autor, gravado pelo papel administrativo (ignora o RLS).
async function comment(tx: Tx, userId: string, titleId: string, body = "oi") {
  const [row] = await tx
    .insert(comments)
    .values({ userId, titleId, body })
    .returning({ id: comments.id });
  return row.id;
}

// Só os comentários da cena de teste: o banco pode ter outros, de outras
// pessoas, já gravados.
const visibleTo = (tx: Tx, viewer: string, titleId: string) =>
  asUser(tx, viewer, async (t) =>
    (
      await t
        .select({ id: comments.id })
        .from(comments)
        .where(eq(comments.titleId, titleId))
    ).map((r) => r.id),
  );

describe("leitura de comentários de outras pessoas (migration 0032)", () => {
  it("outro usuário logado lê o comentário publicado de perfil público", () =>
    inRollback(async (tx) => {
      const author = await person(tx, false);
      const viewer = await person(tx, false);
      const { titleId } = await catalog(tx);
      const id = await comment(tx, author, titleId);
      expect(await visibleTo(tx, viewer, titleId)).toEqual([id]);
      expect(await visibleTo(tx, author, titleId)).toEqual([id]);
    }));

  it("anônimo não lê nada", () =>
    inRollback(async (tx) => {
      const author = await person(tx, false);
      const { titleId } = await catalog(tx);
      await comment(tx, author, titleId);
      await expect(
        tx.transaction(async (sp) => {
          await sp.execute(sql`set local role anon`);
          await sp.select().from(comments);
        }),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("perfil privado: só o dono e o seguidor aceito leem; pendente e estranho não", () =>
    inRollback(async (tx) => {
      const author = await person(tx, true);
      const accepted = await person(tx, false);
      const pending = await person(tx, false);
      const stranger = await person(tx, false);
      const { titleId } = await catalog(tx);
      const id = await comment(tx, author, titleId);
      await tx.insert(follows).values([
        { followerId: accepted, followeeId: author },
        { followerId: pending, followeeId: author },
      ]);
      await tx
        .update(follows)
        .set({ status: "accepted" })
        .where(eq(follows.followerId, accepted));
      expect(await visibleTo(tx, author, titleId)).toEqual([id]);
      expect(await visibleTo(tx, accepted, titleId)).toEqual([id]);
      expect(await visibleTo(tx, pending, titleId)).toEqual([]);
      expect(await visibleTo(tx, stranger, titleId)).toEqual([]);
    }));

  it("comentário oculto ou removido pela plataforma some para os outros, e o autor ainda o vê", () =>
    inRollback(async (tx) => {
      const author = await person(tx, false);
      const viewer = await person(tx, false);
      const { titleId } = await catalog(tx);
      const hidden = await comment(tx, author, titleId, "a");
      const removed = await comment(tx, author, titleId, "b");
      const shown = await comment(tx, author, titleId, "c");
      await tx
        .update(comments)
        .set({ moderationStatus: "hidden" })
        .where(eq(comments.id, hidden));
      await tx
        .update(comments)
        .set({ moderationStatus: "removed" })
        .where(eq(comments.id, removed));
      expect(await visibleTo(tx, viewer, titleId)).toEqual([shown]);
      expect((await visibleTo(tx, author, titleId)).sort()).toEqual(
        [hidden, removed, shown].sort(),
      );
    }));

  it("quem foi bloqueado pelo autor não lê os comentários dele", () =>
    inRollback(async (tx) => {
      const author = await person(tx, false);
      const blocked = await person(tx, false);
      const other = await person(tx, false);
      const { titleId } = await catalog(tx);
      const id = await comment(tx, author, titleId);
      await tx.insert(blocks).values({ blockerId: author, blockedId: blocked });
      expect(await visibleTo(tx, blocked, titleId)).toEqual([]);
      expect(await visibleTo(tx, other, titleId)).toEqual([id]);
    }));

  it("com autores de todos os tipos no mesmo título, cada leitor vê só o que a regra permite (migration 0034)", () =>
    inRollback(async (tx) => {
      const publicAuthor = await person(tx, false);
      const privateFollowed = await person(tx, true);
      const privateStranger = await person(tx, true);
      const blocker = await person(tx, false);
      const privateBlocker = await person(tx, true);
      const viewer = await person(tx, false);
      const { titleId } = await catalog(tx);
      const pub = await comment(tx, publicAuthor, titleId);
      const followed = await comment(tx, privateFollowed, titleId);
      await comment(tx, privateStranger, titleId);
      await comment(tx, blocker, titleId);
      await comment(tx, privateBlocker, titleId);
      await tx.insert(follows).values([
        { followerId: viewer, followeeId: privateFollowed },
        { followerId: viewer, followeeId: privateBlocker },
      ]);
      await tx
        .update(follows)
        .set({ status: "accepted" })
        .where(eq(follows.followerId, viewer));
      await tx.insert(blocks).values([
        { blockerId: blocker, blockedId: viewer },
        { blockerId: privateBlocker, blockedId: viewer },
      ]);
      expect((await visibleTo(tx, viewer, titleId)).sort()).toEqual(
        [pub, followed].sort(),
      );
      // Estranho: público, o próprio comentário e quem não o bloqueou; nenhum privado alheio.
      expect(await visibleTo(tx, privateStranger, titleId)).toHaveLength(3);
    }));

  it("outra pessoa continua sem poder alterar nem apagar o comentário", () =>
    inRollback(async (tx) => {
      const author = await person(tx, false);
      const viewer = await person(tx, false);
      const { titleId } = await catalog(tx);
      const id = await comment(tx, author, titleId);
      const touched = await asUser(tx, viewer, async (t) => {
        const upd = await t
          .update(comments)
          .set({ body: "x" })
          .where(eq(comments.id, id))
          .returning({ id: comments.id });
        const del = await t
          .delete(comments)
          .where(eq(comments.id, id))
          .returning({ id: comments.id });
        return [...upd, ...del];
      });
      expect(touched).toEqual([]);
    }));

  it("o apoio de visibilidade não é chamável por anon", () =>
    inRollback(async (tx) => {
      await expect(
        tx.transaction(async (sp) => {
          await sp.execute(sql`set local role anon`);
          await sp.execute(
            sql`select app.comment_author_visible(gen_random_uuid())`,
          );
        }),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));
});

describe("comentário de temporada e de episódio (migration 0032)", () => {
  it("comentários antigos e novos do título continuam valendo, sem temporada nem episódio", () =>
    inRollback(async (tx) => {
      const author = await person(tx, false);
      const { titleId } = await catalog(tx);
      const id = await comment(tx, author, titleId);
      const [row] = await tx.select().from(comments).where(eq(comments.id, id));
      expect(row.seasonId).toBeNull();
      expect(row.episodeId).toBeNull();
    }));

  it("temporada ou episódio inexistente dá erro de chave estrangeira, não de title_id nulo", () =>
    inRollback(async (tx) => {
      const author = await person(tx, false);
      const c = await catalog(tx);
      await expect(
        tx.transaction((sp) =>
          sp.insert(comments).values({
            userId: author,
            titleId: c.titleId,
            episodeId: "00000000-0000-4000-8000-000000000000",
            body: "x",
          }),
        ),
      ).rejects.toEqual(pgError(FOREIGN_KEY_VIOLATION));
    }));

  it("o title_id é acertado pela temporada ou pelo episódio, e as colunas aceitam um só", () =>
    inRollback(async (tx) => {
      const author = await person(tx, false);
      const c = await catalog(tx);
      const [bySeason] = await asUser(tx, author, (t) =>
        t
          .insert(comments)
          .values({
            userId: author,
            titleId: c.otherTitleId,
            seasonId: c.seasonId,
            body: "temporada",
          })
          .returning(),
      );
      expect(bySeason.titleId).toBe(c.titleId);
      const [byEpisode] = await asUser(tx, author, (t) =>
        t
          .insert(comments)
          .values({
            userId: author,
            titleId: c.otherTitleId,
            episodeId: c.episodeId,
            body: "episódio",
          })
          .returning(),
      );
      expect(byEpisode.titleId).toBe(c.titleId);
      await expect(
        tx.transaction((sp) =>
          sp.insert(comments).values({
            userId: author,
            titleId: c.titleId,
            seasonId: c.seasonId,
            episodeId: c.episodeId,
            body: "os dois",
          }),
        ),
      ).rejects.toEqual(pgError(CHECK_VIOLATION));
    }));
});
