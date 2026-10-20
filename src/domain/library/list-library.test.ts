import { describe, expect, it } from "vitest";
import { listLibrary } from "./list-library";
import { markEpisodeWatched, markMovieWatched } from "./mark-watched";
import { createFakeLibrary, type FakeEpisode, USER } from "./test-fakes";

const SERIES = "aaaaaaaa-0000-4000-8000-000000000001";
const OTHER = "aaaaaaaa-0000-4000-8000-000000000003";
const MOVIE = "aaaaaaaa-0000-4000-8000-000000000002";

function episode(n: number, airDate: string | null): FakeEpisode {
  return {
    id: `bbbbbbbb-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`,
    titleId: SERIES,
    seasonNumber: 1,
    episodeNumber: n,
    airDate,
  };
}
const [E1, E2, E3] = [
  episode(1, "2020-01-01"),
  episode(2, "2020-01-08"),
  episode(3, "2099-01-01"),
];

function setup() {
  return createFakeLibrary({
    titles: { [SERIES]: "tv", [OTHER]: "tv", [MOVIE]: "movie" },
    episodes: [E1, E2, E3],
  });
}

describe("listLibrary", () => {
  it("biblioteca vazia", async () => {
    expect(await listLibrary(setup().deps, USER, {})).toEqual({
      ok: true,
      value: [],
    });
  });

  it("série mostra o progresso sem contar episódio futuro", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, { episodeId: E1.id });
    const result = await listLibrary(lib.deps, USER, {});
    expect(result).toMatchObject({
      ok: true,
      value: [
        {
          titleId: SERIES,
          status: "watching",
          progress: { watched: 1, released: 2 },
        },
      ],
    });
  });

  it("filme não tem progresso", async () => {
    const lib = setup();
    await markMovieWatched(lib.deps, USER, { titleId: MOVIE });
    expect(await listLibrary(lib.deps, USER, {})).toMatchObject({
      ok: true,
      value: [{ titleId: MOVIE, status: "watched", progress: null }],
    });
  });

  it("filtra por status", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, { episodeId: E1.id });
    lib.setStatus(OTHER, "paused");
    const ids = async (filter: string) => {
      const r = await listLibrary(lib.deps, USER, { filter });
      return r.ok ? r.value.map((i) => i.titleId) : null;
    };
    expect(await ids("all")).toHaveLength(2);
    expect(await ids("watching")).toEqual([SERIES]);
    expect(await ids("paused")).toEqual([OTHER]);
    expect(await ids("watchlist")).toEqual([]);
    expect(await ids("watched")).toEqual([]);
    lib.setStatus(OTHER, "watched");
    expect(await ids("watched")).toEqual([OTHER]);
  });

  it("filtra por tipo e limita a quantidade", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, { episodeId: E1.id });
    await markMovieWatched(lib.deps, USER, { titleId: MOVIE });
    const ids = async (input: object) => {
      const result = await listLibrary(lib.deps, USER, input);
      return result.ok ? result.value.map((i) => i.titleId) : null;
    };
    expect(await ids({ mediaType: "movie" })).toEqual([MOVIE]);
    expect(await ids({ mediaType: "tv" })).toEqual([SERIES]);
    expect(await ids({ limit: 1 })).toHaveLength(1);
  });

  it("recusa limite inválido", async () => {
    expect(await listLibrary(setup().deps, USER, { limit: 0 })).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
  });

  it("recusa filtro desconhecido", async () => {
    expect(
      await listLibrary(setup().deps, USER, { filter: "abandonados" }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  });
});
