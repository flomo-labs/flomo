import { describe, expect, it } from "vitest";
import { markEpisodeWatched, markMovieWatched } from "../library/mark-watched";
import { type FakeEpisode, NOW, USER } from "../library/test-fakes";
import {
  deleteRating,
  getMyRatings,
  getTitleRatingSummary,
  setRating,
} from "./rate";
import { createFakeRatings } from "./test-fakes";

const OTHER_USER = { id: "22222222-2222-4222-8222-222222222222" };
const SERIES = "aaaaaaaa-0000-4000-8000-000000000001";
const MOVIE = "aaaaaaaa-0000-4000-8000-000000000002";
const EP1: FakeEpisode = {
  id: "bbbbbbbb-0000-4000-8000-000000000101",
  titleId: SERIES,
  seasonNumber: 1,
  episodeNumber: 1,
  airDate: "2020-01-01",
};
const EP2: FakeEpisode = { ...EP1, id: "bbbbbbbb-0000-4000-8000-000000000102", episodeNumber: 2 };
const S2EP1: FakeEpisode = {
  ...EP1,
  id: "bbbbbbbb-0000-4000-8000-000000000201",
  seasonNumber: 2,
};

function setup() {
  const s = createFakeRatings({
    titles: { [SERIES]: "tv", [MOVIE]: "movie" },
    episodes: [EP1, EP2, S2EP1],
  });
  const watchMovie = (user = USER) =>
    markMovieWatched({ library: s.library.deps.library, now: () => NOW }, user, { titleId: MOVIE });
  const watchEpisode = (id: string, user = USER) =>
    markEpisodeWatched({ library: s.library.deps.library, now: () => NOW }, user, { episodeId: id });
  return { ...s, watchMovie, watchEpisode };
}

describe("setRating", () => {
  it("dá e troca a nota de um filme assistido", async () => {
    const s = setup();
    await s.watchMovie();
    expect(await setRating(s.deps, USER, { titleId: MOVIE, halfStars: 7 })).toEqual({ ok: true, value: {} });
    await setRating(s.deps, USER, { titleId: MOVIE, halfStars: 9 });
    const mine = await getMyRatings(s.deps, USER, { titleId: MOVIE });
    expect(mine).toEqual({ ok: true, value: [{ episodeId: null, halfStars: 9 }] });
  });

  it("dá nota a um episódio visto", async () => {
    const s = setup();
    await s.watchEpisode(EP1.id);
    const result = await setRating(s.deps, USER, { episodeId: EP1.id, halfStars: 10 });
    expect(result.ok).toBe(true);
    expect(s.rows).toEqual([
      { userId: USER.id, titleId: SERIES, episodeId: EP1.id, halfStars: 10 },
    ]);
  });

  it("recusa filme e episódio não assistidos", async () => {
    const s = setup();
    const movie = await setRating(s.deps, USER, { titleId: MOVIE, halfStars: 7 });
    const episode = await setRating(s.deps, USER, { episodeId: EP1.id, halfStars: 7 });
    expect(movie).toMatchObject({ ok: false, error: { code: "NOT_WATCHED" } });
    expect(episode).toMatchObject({ ok: false, error: { code: "NOT_WATCHED" } });
    expect(s.rows).toEqual([]);
  });

  it("série e temporada não recebem nota", async () => {
    const s = setup();
    const result = await setRating(s.deps, USER, { titleId: SERIES, halfStars: 7 });
    expect(result).toMatchObject({ ok: false, error: { code: "NOT_RATABLE" } });
  });

  it("recusa título e episódio inexistentes", async () => {
    const s = setup();
    const missing = "cccccccc-0000-4000-8000-000000000000";
    expect(await setRating(s.deps, USER, { titleId: missing, halfStars: 7 })).toMatchObject({
      error: { code: "TITLE_NOT_FOUND" },
    });
    expect(await setRating(s.deps, USER, { episodeId: missing, halfStars: 7 })).toMatchObject({
      error: { code: "EPISODE_NOT_FOUND" },
    });
  });

  it("recusa nota fora de 1 a 10 e entrada malformada", async () => {
    const s = setup();
    await s.watchMovie();
    for (const input of [
      { titleId: MOVIE, halfStars: 0 },
      { titleId: MOVIE, halfStars: 11 },
      { titleId: MOVIE, halfStars: 3.5 },
      { titleId: "x", halfStars: 5 },
      { halfStars: 5 },
    ]) {
      expect(await setRating(s.deps, USER, input)).toMatchObject({
        ok: false,
        error: { code: "INVALID_INPUT" },
      });
    }
  });
});

describe("deleteRating", () => {
  it("apaga a nota e não falha se ela não existe", async () => {
    const s = setup();
    await s.watchMovie();
    await setRating(s.deps, USER, { titleId: MOVIE, halfStars: 7 });
    expect((await deleteRating(s.deps, USER, { titleId: MOVIE })).ok).toBe(true);
    expect(s.rows).toEqual([]);
    expect((await deleteRating(s.deps, USER, { titleId: MOVIE })).ok).toBe(true);
  });

  it("apaga mesmo com o item desmarcado e só a nota do próprio usuário", async () => {
    const s = setup();
    await s.watchEpisode(EP1.id);
    await s.watchEpisode(EP1.id, OTHER_USER);
    await setRating(s.deps, USER, { episodeId: EP1.id, halfStars: 7 });
    await setRating(s.deps, OTHER_USER, { episodeId: EP1.id, halfStars: 3 });
    await s.library.deps.library.deleteEpisodeProgress(USER.id, EP1.id);
    await deleteRating(s.deps, USER, { episodeId: EP1.id });
    expect(s.rows.map((r) => r.userId)).toEqual([OTHER_USER.id]);
  });

  it("recusa entrada malformada", async () => {
    const s = setup();
    expect(await deleteRating(s.deps, USER, {})).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
  });
});

describe("getTitleRatingSummary", () => {
  it("soma as notas de todos os usuários por temporada e na série", async () => {
    const s = setup();
    for (const [user, ep, stars] of [
      [USER, EP1, 10],
      [OTHER_USER, EP1, 6],
      [USER, EP2, 8],
      [USER, S2EP1, 2],
    ] as const) {
      await s.watchEpisode(ep.id, user);
      await setRating(s.deps, user, { episodeId: ep.id, halfStars: stars });
    }
    const result = await getTitleRatingSummary(s.deps, { titleId: SERIES });
    expect(result).toEqual({
      ok: true,
      value: {
        overall: { average: 6.5, count: 4 },
        bySeason: {
          1: { average: 8, count: 3 },
          2: { average: 2, count: 1 },
        },
        byEpisode: {
          [EP1.id]: { average: 8, count: 2 },
          [EP2.id]: { average: 8, count: 1 },
          [S2EP1.id]: { average: 2, count: 1 },
        },
      },
    });
  });

  it("recusa título malformado", async () => {
    const s = setup();
    expect(await getTitleRatingSummary(s.deps, { titleId: "x" })).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
  });
});
