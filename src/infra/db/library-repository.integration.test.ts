import { and, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import {
  markEpisodeWatched,
  markMovieWatched,
  setWatchDate,
  unmarkEpisodeWatched,
} from "@/domain/library/mark-watched";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { createLibraryRepository } from "./library-repository";
import {
  episodes,
  seasons,
  titles,
  userEpisodeProgress,
  userTitles,
  watchEvents,
} from "./schema";

// Casos de uso da biblioteca contra o banco de teste, pelo mesmo caminho da
// borda: repositório dentro do `withUser`, sob RLS.
afterAll(closeTestDb);

const NOW = new Date("2026-10-16T15:00:00Z");

// Série com especial, duas temporadas (a última com um episódio futuro) e um
// filme.
async function createCatalog(tx: Tx) {
  const [series] = await tx
    .insert(titles)
    .values({ mediaType: "tv", originalTitle: "Série" })
    .returning({ id: titles.id });
  const [movie] = await tx
    .insert(titles)
    .values({ mediaType: "movie", originalTitle: "Filme" })
    .returning({ id: titles.id });
  const ids: Record<string, string> = {};
  for (const [season, count] of [
    [0, 1],
    [1, 2],
    [2, 3],
  ]) {
    const [s] = await tx
      .insert(seasons)
      .values({ titleId: series.id, seasonNumber: season })
      .returning({ id: seasons.id });
    for (let n = 1; n <= count; n++) {
      const airDate = season === 2 && n === 3 ? "2026-12-01" : "2020-01-01";
      const [e] = await tx
        .insert(episodes)
        .values({ seasonId: s.id, episodeNumber: n, airDate })
        .returning({ id: episodes.id });
      ids[`S${season}E${n}`] = e.id;
    }
  }
  return { seriesId: series.id, movieId: movie.id, ep: ids };
}

function run<T>(
  tx: Tx,
  userId: string,
  fn: (
    deps: {
      library: ReturnType<typeof createLibraryRepository>;
      now: () => Date;
    },
    user: { id: string },
  ) => Promise<T>,
) {
  return asUser(tx, userId, (utx) =>
    fn(
      { library: createLibraryRepository(utx), now: () => NOW },
      { id: userId },
    ),
  );
}

describe("marcar como visto no banco", () => {
  it("marca o episódio, os anteriores sem data e põe a série em Assistindo", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);
      await tx
        .insert(userTitles)
        .values({ userId: user, titleId: c.seriesId, status: "paused" });

      const result = await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, {
          episodeId: c.ep.S2E2,
          includePrevious: true,
        }),
      );
      expect(result).toEqual({
        ok: true,
        value: { marked: true, previousMarked: 3 },
      });

      const [status] = await tx
        .select({ status: userTitles.status })
        .from(userTitles)
        .where(eq(userTitles.userId, user));
      expect(status.status).toBe("watching");

      const events = await tx
        .select()
        .from(watchEvents)
        .where(eq(watchEvents.userId, user));
      const byEpisode = new Map(events.map((e) => [e.episodeId, e]));
      expect(byEpisode.get(c.ep.S2E2)).toMatchObject({
        watchedAt: NOW,
        watchedAtPrecision: "exact",
        source: "live",
        titleId: c.seriesId,
      });
      for (const id of [c.ep.S1E1, c.ep.S1E2, c.ep.S2E1]) {
        expect(byEpisode.get(id)).toMatchObject({
          watchedAt: null,
          watchedAtPrecision: "unknown",
          source: "backfill",
        });
      }
      // Especial e episódio futuro ficam de fora.
      expect(byEpisode.has(c.ep.S0E1)).toBe(false);
      expect(events).toHaveLength(4);

      const again = await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, {
          episodeId: c.ep.S2E2,
          includePrevious: true,
        }),
      );
      expect(again).toEqual({
        ok: true,
        value: { marked: false, previousMarked: 0 },
      });
    }));

  it("filme: grava uma vez e põe em Visto", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);

      for (const marked of [true, false]) {
        expect(
          await run(tx, user, (deps, u) =>
            markMovieWatched(deps, u, { titleId: c.movieId }),
          ),
        ).toEqual({ ok: true, value: { marked } });
      }
      const [row] = await tx
        .select({ status: userTitles.status })
        .from(userTitles)
        .where(
          and(eq(userTitles.userId, user), eq(userTitles.titleId, c.movieId)),
        );
      expect(row.status).toBe("watched");

      // Marcar de novo não regrava o título (updated_at fica igual).
      const old = new Date("2020-01-01T00:00:00Z");
      // Sem o trigger, para conseguir gravar uma data antiga.
      await tx.execute(
        sql`alter table user_titles disable trigger user_titles_set_updated_at`,
      );
      await tx
        .update(userTitles)
        .set({ updatedAt: old })
        .where(eq(userTitles.userId, user));
      await tx.execute(
        sql`alter table user_titles enable trigger user_titles_set_updated_at`,
      );
      await run(tx, user, (deps, u) =>
        markMovieWatched(deps, u, { titleId: c.movieId }),
      );
      const [after] = await tx
        .select({ updatedAt: userTitles.updatedAt })
        .from(userTitles)
        .where(eq(userTitles.userId, user));
      expect(after.updatedAt).toEqual(old);
    }));

  it("desmarcar apaga progresso e histórico do episódio", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, { episodeId: c.ep.S1E1 }),
      );
      expect(
        await run(tx, user, (deps, u) =>
          unmarkEpisodeWatched(deps, u, { episodeId: c.ep.S1E1 }),
        ),
      ).toEqual({ ok: true, value: { removed: true } });

      const progress = await tx
        .select()
        .from(userEpisodeProgress)
        .where(eq(userEpisodeProgress.userId, user));
      const events = await tx
        .select()
        .from(watchEvents)
        .where(eq(watchEvents.userId, user));
      expect([progress.length, events.length]).toEqual([0, 0]);
    }));

  it("trocar a data atualiza o progresso; outro usuário não acha o registro", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const other = await createUser(tx);
      const c = await createCatalog(tx);
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, { episodeId: c.ep.S1E1 }),
      );
      const [event] = await tx
        .select({ id: watchEvents.id })
        .from(watchEvents)
        .where(eq(watchEvents.userId, user));

      expect(
        await run(tx, other, (deps, u) =>
          setWatchDate(deps, u, {
            eventId: event.id,
            when: { kind: "unknown" },
          }),
        ),
      ).toMatchObject({ ok: false, error: { code: "EVENT_NOT_FOUND" } });

      expect(
        await run(tx, user, (deps, u) =>
          setWatchDate(deps, u, {
            eventId: event.id,
            when: { kind: "date", precision: "day", value: "2025-03-10" },
          }),
        ),
      ).toEqual({ ok: true, value: { eventId: event.id } });

      const [progress] = await tx
        .select({ watchedAt: userEpisodeProgress.watchedAt })
        .from(userEpisodeProgress)
        .where(eq(userEpisodeProgress.userId, user));
      expect(progress.watchedAt).toEqual(new Date("2025-03-10T12:00:00Z"));

      await run(tx, user, (deps, u) =>
        setWatchDate(deps, u, { eventId: event.id, when: { kind: "unknown" } }),
      );
      const [cleared] = await tx
        .select({ watchedAt: userEpisodeProgress.watchedAt })
        .from(userEpisodeProgress)
        .where(eq(userEpisodeProgress.userId, user));
      expect(cleared.watchedAt).toBeNull();
    }));
});
