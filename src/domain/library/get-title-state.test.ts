import { describe, expect, it } from "vitest";
import {
  getTitleLibraryState,
  listRefsInLibrary,
  listUnwatchedEpisodes,
} from "./get-title-state";
import { markEpisodeWatched, markMovieWatched } from "./mark-watched";
import { createFakeLibrary, type FakeEpisode, NOW, USER } from "./test-fakes";

const SERIES = "aaaaaaaa-0000-4000-8000-000000000001";
const MOVIE = "aaaaaaaa-0000-4000-8000-000000000002";
const E1: FakeEpisode = {
  id: "bbbbbbbb-0000-4000-8000-000000000101",
  titleId: SERIES,
  seasonNumber: 1,
  episodeNumber: 1,
  airDate: "2020-01-01",
};

function setup() {
  return createFakeLibrary({
    titles: { [SERIES]: "tv", [MOVIE]: "movie" },
    episodes: [E1],
  });
}

describe("getTitleLibraryState", () => {
  it("título fora da biblioteca: sem status e nada visto", async () => {
    const lib = setup();
    expect(
      await getTitleLibraryState(lib.deps, USER, { titleId: SERIES }),
    ).toEqual({
      ok: true,
      value: { status: null, hidden: false, watched: [] },
    });
  });

  it("devolve o status e os itens vistos, com a data", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, { episodeId: E1.id });
    const result = await getTitleLibraryState(lib.deps, USER, {
      titleId: SERIES,
    });
    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "watching",
        watched: [{ episodeId: E1.id, watchedAt: NOW, precision: "exact" }],
      },
    });
  });

  it("filme visto aparece com episódio nulo", async () => {
    const lib = setup();
    await markMovieWatched(lib.deps, USER, { titleId: MOVIE });
    const result = await getTitleLibraryState(lib.deps, USER, {
      titleId: MOVIE,
    });
    expect(result).toMatchObject({
      ok: true,
      value: { status: "watched", watched: [{ episodeId: null }] },
    });
  });

  it("recusa id inválido", async () => {
    const lib = setup();
    expect(
      await getTitleLibraryState(lib.deps, USER, { titleId: "x" }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  });
});

describe("listUnwatchedEpisodes", () => {
  it("lista só os regulares lançados que faltam ver", async () => {
    const E2: FakeEpisode = {
      ...E1,
      id: E1.id.replace(/1$/, "2"),
      episodeNumber: 2,
    };
    const FUTURE: FakeEpisode = {
      ...E1,
      id: E1.id.replace(/1$/, "3"),
      episodeNumber: 3,
      airDate: "2099-01-01",
    };
    const SPECIAL: FakeEpisode = {
      ...E1,
      id: E1.id.replace(/1$/, "4"),
      seasonNumber: 0,
    };
    const lib = createFakeLibrary({
      titles: { [SERIES]: "tv" },
      episodes: [E1, E2, FUTURE, SPECIAL],
    });
    await markEpisodeWatched(lib.deps, USER, { episodeId: E1.id });
    expect(
      await listUnwatchedEpisodes(lib.deps, USER, { titleId: SERIES }),
    ).toEqual({ ok: true, value: [{ seasonNumber: 1, episodeNumber: 2 }] });
    expect(
      await listUnwatchedEpisodes(lib.deps, USER, { titleId: "x" }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  });
});

describe("listRefsInLibrary", () => {
  const SERIES_REF = { mediaType: "tv", externalId: "100" } as const;
  const MOVIE_REF = { mediaType: "movie", externalId: "100" } as const;
  const refs = [SERIES_REF, MOVIE_REF, { mediaType: "tv", externalId: "999" }];

  function setupRefs() {
    const lib = createFakeLibrary({
      titles: { [SERIES]: "tv", [MOVIE]: "movie" },
    });
    // Catálogo: só a série e o filme (ids externos iguais, tipos diferentes).
    const known = [
      { ref: SERIES_REF, id: SERIES },
      { ref: MOVIE_REF, id: MOVIE },
    ];
    const deps = {
      catalog: {
        store: {
          findTitlesByRefs: async (wanted: readonly (typeof refs)[number][]) =>
            known.filter((k) =>
              wanted.some(
                (w) =>
                  w.mediaType === k.ref.mediaType &&
                  w.externalId === k.ref.externalId,
              ),
            ),
        },
      } as unknown as Parameters<typeof listRefsInLibrary>[0]["catalog"],
      inLibrary: <T>(run: (d: typeof lib.deps) => Promise<T>) => run(lib.deps),
    };
    return { lib, deps };
  }

  it("devolve só as referências que estão na biblioteca", async () => {
    const { lib, deps } = setupRefs();
    await markMovieWatched(lib.deps, USER, { titleId: MOVIE });
    expect(await listRefsInLibrary(deps, USER, { refs })).toEqual({
      ok: true,
      value: [MOVIE_REF],
    });
  });

  it("filme e série com o mesmo id externo são títulos diferentes", async () => {
    const { lib, deps } = setupRefs();
    await lib.deps.library.addTitleIfAbsent(USER.id, SERIES, "watchlist");
    expect(await listRefsInLibrary(deps, USER, { refs })).toEqual({
      ok: true,
      value: [SERIES_REF],
    });
  });

  it("recusa entrada inválida", async () => {
    const { deps } = setupRefs();
    const result = await listRefsInLibrary(deps, USER, {
      refs: [{ mediaType: "tv", externalId: "abc" }],
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
  });
});
