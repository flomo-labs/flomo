import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import {
  createComment,
  listTitleComments,
} from "@/domain/comment/comments";
import type { Tx } from "./client";
import { createCommentRepository } from "./comment-repository";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { createLibraryRepository } from "./library-repository";
import {
  blocks,
  comments,
  episodes,
  follows,
  profiles,
  seasons,
  titles,
} from "./schema";

// Leitura e escrita de comentários de título, temporada e episódio pelos casos
// de uso, com os repositórios dentro do `withUser` (RLS), como na borda.
afterAll(closeTestDb);

async function person(tx: Tx, isPrivate = false) {
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
    .values({ mediaType: "tv", originalTitle: "Outra série" })
    .returning({ id: titles.id });
  const [season] = await tx
    .insert(seasons)
    .values({ titleId: series.id, seasonNumber: 1 })
    .returning({ id: seasons.id });
  const [episode] = await tx
    .insert(episodes)
    .values({ seasonId: season.id, episodeNumber: 1 })
    .returning({ id: episodes.id });
  const [otherSeason] = await tx
    .insert(seasons)
    .values({ titleId: other.id, seasonNumber: 1 })
    .returning({ id: seasons.id });
  return {
    titleId: series.id,
    seasonId: season.id,
    episodeId: episode.id,
    otherSeasonId: otherSeason.id,
  };
}

function as<T>(
  tx: Tx,
  userId: string,
  fn: (
    deps: {
      comments: ReturnType<typeof createCommentRepository>;
      library: ReturnType<typeof createLibraryRepository>;
    },
    user: { id: string },
  ) => Promise<T>,
) {
  return asUser(tx, userId, (utx) =>
    fn(
      {
        comments: createCommentRepository(utx),
        library: createLibraryRepository(utx),
      },
      { id: userId },
    ),
  );
}

async function write(tx: Tx, author: string, input: object) {
  const r = await as(tx, author, (d, u) => createComment(d, u, input));
  if (!r.ok) throw new Error(`não criou: ${r.error.code}`);
  return r.value;
}

async function bodiesFor(tx: Tx, viewer: string, input: object) {
  const r = await as(tx, viewer, (d, u) => listTitleComments(d, u, input));
  if (!r.ok) throw new Error(`não listou: ${r.error.code}`);
  return r.value.items.map((c) => c.body).sort();
}

describe("comentários de outras pessoas e de temporada/episódio no banco", () => {
  it("grava comentário de temporada e de episódio com o título certo e lista por escopo", () =>
    inRollback(async (tx) => {
      const author = await person(tx);
      const viewer = await person(tx);
      const { titleId, seasonId, episodeId } = await catalog(tx);
      const onSeason = await write(tx, author, { titleId, seasonId, body: "temporada" });
      const onEpisode = await write(tx, author, { titleId, episodeId, body: "episódio" });
      await write(tx, author, { titleId, body: "título" });
      expect(onSeason).toMatchObject({ titleId, seasonId, episodeId: null });
      expect(onEpisode).toMatchObject({ titleId, seasonId: null, episodeId });

      expect(await bodiesFor(tx, viewer, { titleId })).toEqual(["título"]);
      expect(await bodiesFor(tx, viewer, { titleId, seasonId })).toEqual(["temporada"]);
      expect(await bodiesFor(tx, viewer, { titleId, episodeId })).toEqual(["episódio"]);
    }));

  it("recusa temporada de outro título", () =>
    inRollback(async (tx) => {
      const author = await person(tx);
      const { titleId, otherSeasonId } = await catalog(tx);
      const r = await as(tx, author, (d, u) =>
        createComment(d, u, { titleId, seasonId: otherSeasonId, body: "x" }),
      );
      expect(r).toMatchObject({ error: { code: "TARGET_NOT_FOUND" } });
    }));

  it("traz o autor de perfil público e a lista não inclui os próprios comentários", () =>
    inRollback(async (tx) => {
      const author = await person(tx);
      const viewer = await person(tx);
      const { titleId } = await catalog(tx);
      await write(tx, author, { titleId, body: "dela" });
      await write(tx, viewer, { titleId, body: "meu" });
      const r = await as(tx, viewer, (d, u) => listTitleComments(d, u, { titleId }));
      expect(r.ok && r.value.items).toHaveLength(1);
      expect(r.ok && r.value.items[0]).toMatchObject({
        body: "dela",
        author: { id: author },
      });
    }));

  it("só aparece o que a política permite: perfil privado, bloqueio e comentário oculto", () =>
    inRollback(async (tx) => {
      const author = await person(tx);
      const privateAuthor = await person(tx, true);
      const follower = await person(tx);
      const stranger = await person(tx);
      const blocked = await person(tx);
      const { titleId } = await catalog(tx);
      await write(tx, author, { titleId, body: "público" });
      await write(tx, privateAuthor, { titleId, body: "privado" });
      const hidden = await write(tx, author, { titleId, body: "oculto" });
      await tx
        .update(comments)
        .set({ moderationStatus: "hidden" })
        .where(eq(comments.id, hidden.id));
      await tx
        .insert(follows)
        .values({ followerId: follower, followeeId: privateAuthor });
      await tx
        .update(follows)
        .set({ status: "accepted" })
        .where(eq(follows.followerId, follower));
      await tx.insert(blocks).values({ blockerId: author, blockedId: blocked });

      expect(await bodiesFor(tx, stranger, { titleId })).toEqual(["público"]);
      expect(await bodiesFor(tx, follower, { titleId })).toEqual(["privado", "público"]);
      expect(await bodiesFor(tx, blocked, { titleId })).toEqual([]);
    }));

  it("pagina sem repetir nem perder, mesmo com a mesma data de criação", () =>
    inRollback(async (tx) => {
      const author = await person(tx);
      const viewer = await person(tx);
      const { titleId } = await catalog(tx);
      for (let i = 1; i <= 5; i++) {
        await write(tx, author, { titleId, body: `c${i}` });
      }
      const seen: string[] = [];
      let after: { at: string; id: string } | null = null;
      for (let page = 0; page < 5; page++) {
        const r = await as(tx, viewer, (d, u) =>
          listTitleComments(d, u, { titleId, limit: 2, after }),
        );
        if (!r.ok) throw new Error("não listou");
        seen.push(...r.value.items.map((c) => c.body));
        after = r.value.next;
        if (!after) break;
      }
      expect(seen.sort()).toEqual(["c1", "c2", "c3", "c4", "c5"]);
    }));
});
