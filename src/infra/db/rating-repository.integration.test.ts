import { afterAll, describe, expect, it } from "vitest";
import {
  markEpisodeWatched,
  markMovieWatched,
  unmarkEpisodeWatched,
} from "@/domain/library/mark-watched";
import {
  deleteRating,
  getMyRatings,
  getTitleRatingSummary,
  setRating,
} from "@/domain/rating/rate";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { createLibraryRepository } from "./library-repository";
import { createRatingRepository } from "./rating-repository";
import { episodes, seasons, titles } from "./schema";

// Casos de uso de nota contra o banco de teste, pelo mesmo caminho da borda:
// repositórios dentro do `withUser`, sob RLS.
afterAll(closeTestDb);

const NOW = new Date("2026-10-18T15:00:00Z");

// Série com duas temporadas (duas e um episódios) e um filme.
async function createCatalog(tx: Tx) {
  const [series] = await tx
    .insert(titles)
    .values({ mediaType: "tv", originalTitle: "Série" })
    .returning({ id: titles.id });
  const [movie] = await tx
    .insert(titles)
    .values({ mediaType: "movie", originalTitle: "Filme" })
    .returning({ id: titles.id });
  const ep: Record<string, string> = {};
  for (const [season, count] of [
    [1, 2],
    [2, 1],
  ]) {
    const [s] = await tx
      .insert(seasons)
      .values({ titleId: series.id, seasonNumber: season })
      .returning({ id: seasons.id });
    for (let n = 1; n <= count; n++) {
      const [e] = await tx
        .insert(episodes)
        .values({ seasonId: s.id, episodeNumber: n, airDate: "2020-01-01" })
        .returning({ id: episodes.id });
      ep[`S${season}E${n}`] = e.id;
    }
  }
  return { seriesId: series.id, movieId: movie.id, ep };
}

function run<T>(
  tx: Tx,
  userId: string,
  fn: (
    deps: {
      library: ReturnType<typeof createLibraryRepository>;
      ratings: ReturnType<typeof createRatingRepository>;
      now: () => Date;
    },
    user: { id: string },
  ) => Promise<T>,
) {
  return asUser(tx, userId, (utx) =>
    fn(
      {
        library: createLibraryRepository(utx),
        ratings: createRatingRepository(utx),
        now: () => NOW,
      },
      { id: userId },
    ),
  );
}

describe("notas no banco", () => {
  it("dá, troca e apaga a nota do filme assistido", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);

      const early = await run(tx, user, (d, u) =>
        setRating(d, u, { titleId: c.movieId, halfStars: 7 }),
      );
      expect(early).toMatchObject({ error: { code: "NOT_WATCHED" } });

      await run(tx, user, (d, u) =>
        markMovieWatched(d, u, { titleId: c.movieId }),
      );
      for (const halfStars of [7, 9]) {
        const result = await run(tx, user, (d, u) =>
          setRating(d, u, { titleId: c.movieId, halfStars }),
        );
        expect(result.ok).toBe(true);
      }
      const mine = await run(tx, user, (d, u) =>
        getMyRatings(d, u, { titleId: c.movieId }),
      );
      expect(mine).toEqual({
        ok: true,
        value: [{ episodeId: null, halfStars: 9 }],
      });

      await run(tx, user, (d, u) => deleteRating(d, u, { titleId: c.movieId }));
      const after = await run(tx, user, (d, u) =>
        getMyRatings(d, u, { titleId: c.movieId }),
      );
      expect(after).toEqual({ ok: true, value: [] });
    }));

  it("nota de episódio exige o episódio visto e sobrevive a desmarcar", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);
      const e1 = c.ep.S1E1;

      const early = await run(tx, user, (d, u) =>
        setRating(d, u, { episodeId: e1, halfStars: 8 }),
      );
      expect(early).toMatchObject({ error: { code: "NOT_WATCHED" } });

      await run(tx, user, (d, u) =>
        markEpisodeWatched(d, u, { episodeId: e1 }),
      );
      await run(tx, user, (d, u) =>
        setRating(d, u, { episodeId: e1, halfStars: 8 }),
      );
      await run(tx, user, (d, u) => unmarkEpisodeWatched(d, u, { episodeId: e1 }));
      const mine = await run(tx, user, (d, u) =>
        getMyRatings(d, u, { titleId: c.seriesId }),
      );
      expect(mine).toEqual({
        ok: true,
        value: [{ episodeId: e1, halfStars: 8 }],
      });

      // Desmarcado, não dá para trocar a nota, mas dá para apagá-la.
      const swap = await run(tx, user, (d, u) =>
        setRating(d, u, { episodeId: e1, halfStars: 2 }),
      );
      expect(swap).toMatchObject({ error: { code: "NOT_WATCHED" } });
      await run(tx, user, (d, u) => deleteRating(d, u, { episodeId: e1 }));
      const after = await run(tx, user, (d, u) =>
        getMyRatings(d, u, { titleId: c.seriesId }),
      );
      expect(after).toEqual({ ok: true, value: [] });
    }));

  it("série não recebe nota", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);
      const result = await run(tx, user, (d, u) =>
        setRating(d, u, { titleId: c.seriesId, halfStars: 8 }),
      );
      expect(result).toMatchObject({ error: { code: "NOT_RATABLE" } });
    }));

  it("cada usuário só vê e apaga as próprias notas", () =>
    inRollback(async (tx) => {
      const [a, b] = [await createUser(tx), await createUser(tx)];
      const c = await createCatalog(tx);
      for (const [user, stars] of [
        [a, 10],
        [b, 4],
      ] as const) {
        await run(tx, user, (d, u) =>
          markEpisodeWatched(d, u, { episodeId: c.ep.S1E1 }),
        );
        await run(tx, user, (d, u) =>
          setRating(d, u, { episodeId: c.ep.S1E1, halfStars: stars }),
        );
      }
      await run(tx, a, (d, u) => deleteRating(d, u, { episodeId: c.ep.S1E1 }));
      const mineB = await run(tx, b, (d, u) =>
        getMyRatings(d, u, { titleId: c.seriesId }),
      );
      expect(mineB).toEqual({
        ok: true,
        value: [{ episodeId: c.ep.S1E1, halfStars: 4 }],
      });
    }));

  it("a média soma todos os usuários, por temporada e na série", () =>
    inRollback(async (tx) => {
      const [a, b, viewer] = [
        await createUser(tx),
        await createUser(tx),
        await createUser(tx),
      ];
      const c = await createCatalog(tx);
      for (const [user, episode, stars] of [
        [a, c.ep.S1E1, 10],
        [b, c.ep.S1E1, 6],
        [a, c.ep.S1E2, 8],
        [a, c.ep.S2E1, 2],
      ] as const) {
        await run(tx, user, (d, u) => markEpisodeWatched(d, u, { episodeId: episode }));
        await run(tx, user, (d, u) =>
          setRating(d, u, { episodeId: episode, halfStars: stars }),
        );
      }
      // Quem não deu nenhuma nota também vê as médias, sem ver nota de ninguém.
      const result = await run(tx, viewer, (d) =>
        getTitleRatingSummary(d, { titleId: c.seriesId }),
      );
      expect(result).toEqual({
        ok: true,
        value: {
          overall: { average: 6.5, count: 4 },
          bySeason: {
            1: { average: 8, count: 3 },
            2: { average: 2, count: 1 },
          },
        },
      });
    }));
});
