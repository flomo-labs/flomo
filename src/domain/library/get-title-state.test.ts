import { describe, expect, it } from "vitest";
import { getTitleLibraryState } from "./get-title-state";
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
    ).toEqual({ ok: true, value: { status: null, watched: [] } });
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
