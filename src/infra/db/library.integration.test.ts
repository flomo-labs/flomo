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
  episodes,
  seasons,
  titles,
  userEpisodeProgress,
  userTitles,
  watchEvents,
} from "./schema";

// Exercita o SQL da migration da biblioteca (policies, CHECKs, cascata,
// restrict e trigger) no banco de teste.
afterAll(closeTestDb);

function pgError(code: string) {
  return expect.objectContaining({
    cause: expect.objectContaining({ code }),
  });
}

const INSUFFICIENT_PRIVILEGE = "42501"; // inclui violação de RLS
const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";

// Uma série com um episódio e um filme, gravados pelo servidor.
async function createCatalog(tx: Tx) {
  const [series] = await tx
    .insert(titles)
    .values({ mediaType: "tv", originalTitle: "Série de teste" })
    .returning({ id: titles.id });
  const [movie] = await tx
    .insert(titles)
    .values({ mediaType: "movie", originalTitle: "Filme de teste" })
    .returning({ id: titles.id });
  const [season] = await tx
    .insert(seasons)
    .values({ titleId: series.id, seasonNumber: 1 })
    .returning({ id: seasons.id });
  const [episode] = await tx
    .insert(episodes)
    .values({ seasonId: season.id, episodeNumber: 1 })
    .returning({ id: episodes.id });
  return { seriesId: series.id, movieId: movie.id, episodeId: episode.id };
}

// Grava as três tabelas como o próprio usuário.
async function seedLibrary(
  tx: Tx,
  userId: string,
  c: Awaited<ReturnType<typeof createCatalog>>,
) {
  await asUser(tx, userId, async (utx) => {
    await utx
      .insert(userTitles)
      .values({ userId, titleId: c.seriesId, status: "watching" });
    await utx.insert(userEpisodeProgress).values({
      userId,
      episodeId: c.episodeId,
      titleId: c.seriesId,
      watchedAt: new Date(),
    });
    await utx.insert(watchEvents).values({
      userId,
      titleId: c.seriesId,
      episodeId: c.episodeId,
      watchedAt: new Date(),
      watchedAtPrecision: "exact",
      source: "live",
    });
  });
}

async function countRows(tx: Tx, userId: string) {
  const [t, p, e] = await Promise.all([
    tx.select().from(userTitles).where(eq(userTitles.userId, userId)),
    tx
      .select()
      .from(userEpisodeProgress)
      .where(eq(userEpisodeProgress.userId, userId)),
    tx.select().from(watchEvents).where(eq(watchEvents.userId, userId)),
  ]);
  return [t.length, p.length, e.length];
}

describe("policies da biblioteca", () => {
  it("o dono grava e lê as próprias linhas nas três tabelas", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const c = await createCatalog(tx);
      await seedLibrary(tx, owner, c);

      const seen = await asUser(tx, owner, (utx) => countRows(utx, owner));
      expect(seen).toEqual([1, 1, 1]);
    }));

  it("outro usuário não vê, não altera e não apaga a biblioteca alheia", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      const c = await createCatalog(tx);
      await seedLibrary(tx, owner, c);

      const seen = await asUser(tx, other, (utx) => countRows(utx, owner));
      expect(seen).toEqual([0, 0, 0]);

      const changed = await asUser(tx, other, async (utx) => [
        await utx
          .update(userTitles)
          .set({ status: "dropped" })
          .where(eq(userTitles.userId, owner))
          .returning(),
        await utx
          .delete(userEpisodeProgress)
          .where(eq(userEpisodeProgress.userId, owner))
          .returning(),
        await utx
          .update(watchEvents)
          .set({ watchedAt: null, watchedAtPrecision: "unknown" })
          .where(eq(watchEvents.userId, owner))
          .returning(),
        await utx
          .delete(watchEvents)
          .where(eq(watchEvents.userId, owner))
          .returning(),
      ]);
      expect(changed.map((rows) => rows.length)).toEqual([0, 0, 0, 0]);
      expect(await countRows(tx, owner)).toEqual([1, 1, 1]);
    }));

  it("ninguém grava em nome de outro usuário", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      const c = await createCatalog(tx);

      await expect(
        asUser(tx, other, (utx) =>
          utx
            .insert(userTitles)
            .values({ userId: owner, titleId: c.movieId, status: "watchlist" }),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));

      await expect(
        asUser(tx, other, (utx) =>
          utx.insert(watchEvents).values({
            userId: owner,
            titleId: c.movieId,
            watchedAtPrecision: "unknown",
            source: "backfill",
          }),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("o dono não passa a própria linha para outro usuário", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      const c = await createCatalog(tx);
      await seedLibrary(tx, owner, c);

      await expect(
        asUser(tx, owner, (utx) =>
          utx
            .update(watchEvents)
            .set({ userId: other })
            .where(eq(watchEvents.userId, owner)),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("anon não vê a biblioteca", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const c = await createCatalog(tx);
      await seedLibrary(tx, owner, c);

      const seen = await tx.transaction(async (sp) => {
        await sp.execute(sql`set local role anon`);
        const rows = await countRows(sp, owner);
        // Liberar o savepoint não desfaz o `set local`.
        await sp.execute(sql`reset role`);
        return rows;
      });
      expect(seen).toEqual([0, 0, 0]);
    }));
});

describe("regras do banco da biblioteca", () => {
  it("title_id sempre vem do episódio, qualquer que seja o valor enviado", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const c = await createCatalog(tx);

      // Como o usuário, mandando o filme como título de um episódio da série.
      const [progress, event] = await asUser(tx, owner, async (utx) => [
        ...(await utx
          .insert(userEpisodeProgress)
          .values({ userId: owner, episodeId: c.episodeId, titleId: c.movieId })
          .returning({ titleId: userEpisodeProgress.titleId })),
        ...(await utx
          .insert(watchEvents)
          .values({
            userId: owner,
            titleId: c.movieId,
            episodeId: c.episodeId,
            watchedAtPrecision: "unknown",
            source: "backfill",
          })
          .returning({ titleId: watchEvents.titleId })),
      ]);
      expect(progress.titleId).toBe(c.seriesId);
      expect(event.titleId).toBe(c.seriesId);

      const [moved] = await tx
        .update(watchEvents)
        .set({ titleId: c.movieId })
        .where(eq(watchEvents.userId, owner))
        .returning({ titleId: watchEvents.titleId });
      expect(moved.titleId).toBe(c.seriesId);
    }));

  it("watch_events: sem data se e só se a precisão é unknown", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const c = await createCatalog(tx);
      const base = { userId: owner, titleId: c.movieId, source: "live" };

      await expect(
        tx.transaction((sp) =>
          sp
            .insert(watchEvents)
            .values({ ...base, watchedAt: null, watchedAtPrecision: "exact" }),
        ),
      ).rejects.toEqual(pgError(CHECK_VIOLATION));

      await expect(
        tx.transaction((sp) =>
          sp.insert(watchEvents).values({
            ...base,
            watchedAt: new Date(),
            watchedAtPrecision: "unknown",
          }),
        ),
      ).rejects.toEqual(pgError(CHECK_VIOLATION));

      await tx.insert(watchEvents).values([
        { ...base, watchedAt: null, watchedAtPrecision: "unknown" },
        {
          ...base,
          watchedAt: new Date("2023-01-01T12:00:00Z"),
          watchedAtPrecision: "year",
        },
      ]);
    }));

  it("recusa status, origem, precisão e nota fora da lista", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const c = await createCatalog(tx);
      const event = {
        userId: owner,
        titleId: c.movieId,
        watchedAt: new Date(),
        watchedAtPrecision: "exact",
        source: "live",
      };
      const attempts = [
        tx
          .insert(userTitles)
          .values({ userId: owner, titleId: c.movieId, status: "favorito" }),
        tx.insert(watchEvents).values({ ...event, source: "manual" }),
        tx.insert(watchEvents).values({ ...event, watchedAtPrecision: "week" }),
        tx.insert(watchEvents).values({ ...event, ratingHalfStars: 0 }),
        tx.insert(watchEvents).values({ ...event, ratingHalfStars: 11 }),
      ];
      for (const attempt of attempts) {
        await expect(tx.transaction(() => attempt)).rejects.toEqual(
          pgError(CHECK_VIOLATION),
        );
      }
      await tx.insert(watchEvents).values({ ...event, ratingHalfStars: 7 });
    }));

  it("apagar a conta apaga a biblioteca em cascata", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const c = await createCatalog(tx);
      await seedLibrary(tx, owner, c);

      await tx.execute(sql`delete from auth.users where id = ${owner}`);
      expect(await countRows(tx, owner)).toEqual([0, 0, 0]);
    }));

  it("não deixa apagar título ou episódio que está no histórico de alguém", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const c = await createCatalog(tx);
      await seedLibrary(tx, owner, c);

      await expect(
        tx.transaction((sp) =>
          sp.delete(episodes).where(eq(episodes.id, c.episodeId)),
        ),
      ).rejects.toEqual(pgError(FOREIGN_KEY_VIOLATION));
      await expect(
        tx.transaction((sp) =>
          sp.delete(titles).where(eq(titles.id, c.seriesId)),
        ),
      ).rejects.toEqual(pgError(FOREIGN_KEY_VIOLATION));
    }));

  it("user_titles: updated_at muda a cada alteração", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const c = await createCatalog(tx);
      const old = new Date("2020-01-01T00:00:00Z");
      await tx.insert(userTitles).values({
        userId: owner,
        titleId: c.movieId,
        status: "watchlist",
        updatedAt: old,
      });

      const [row] = await tx
        .update(userTitles)
        .set({ status: "watched" })
        .where(eq(userTitles.userId, owner))
        .returning({ updatedAt: userTitles.updatedAt });
      expect(row.updatedAt.getTime()).toBeGreaterThan(old.getTime());
    }));
});
