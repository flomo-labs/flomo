import { describe, expect, it, vi } from "vitest";
import { CatalogUnavailableError } from "@/domain/catalog/ports";
import type { TmdbClient } from "./client";
import { createTmdbProvider, mapMovie, mapSearch } from "./provider";

// Respostas no formato da API v3 do TMDB, reduzidas e com valores fictícios.

const SEARCH = {
  page: 1,
  total_pages: 3,
  total_results: 42,
  results: [
    {
      media_type: "tv",
      id: 1396,
      name: "Breaking Bad: A Química do Mal",
      original_name: "Breaking Bad",
      original_language: "en",
      first_air_date: "2008-01-20",
      overview: "",
      poster_path: "/bb.jpg",
      popularity: 1, // campo não usado: fica de fora
    },
    {
      media_type: "movie",
      id: 559969,
      title: "El Camino",
      original_title: "El Camino: A Breaking Bad Movie",
      original_language: "en",
      release_date: "",
      overview: "Sinopse.",
      poster_path: null,
    },
    { media_type: "person", id: 17419, name: "Bryan Cranston" },
    { media_type: "movie", id: "quebrado" },
  ],
};

const MOVIE = {
  id: 603,
  title: "Matrix",
  original_title: "The Matrix",
  original_language: "en",
  release_date: "1999-03-31",
  runtime: 136,
  status: "Released",
  overview: "Sinopse.",
  poster_path: "/matrix.jpg",
  backdrop_path: "/fundo.jpg",
  genres: [{ id: 28, name: "Ação" }],
  budget: 63000000,
};

function tvDetails(seasonNumbers: number[]) {
  return {
    id: 1399,
    name: "A Guerra dos Tronos",
    original_name: "Game of Thrones",
    original_language: "en",
    first_air_date: "2011-04-17",
    episode_run_time: [],
    status: "Ended",
    overview: "Sinopse.",
    poster_path: "/got.jpg",
    backdrop_path: null,
    genres: [{ id: 18, name: "Drama" }],
    seasons: seasonNumbers.map((n) => ({ season_number: n, episode_count: 1 })),
  };
}

function season(n: number) {
  return {
    season_number: n,
    name: `Temporada ${n}`,
    overview: "",
    air_date: "2011-04-17",
    poster_path: null,
    episodes: [
      {
        episode_number: 1,
        name: "Episódio 1",
        overview: "",
        air_date: "2011-04-17",
        runtime: 62,
        crew: [],
      },
    ],
  };
}

describe("mapSearch", () => {
  it("traz filmes e séries com os campos usados e ignora pessoas e itens malformados", () => {
    expect(mapSearch(SEARCH)).toEqual({
      page: 1,
      totalPages: 3,
      totalResults: 42,
      items: [
        {
          ref: { mediaType: "tv", externalId: "1396" },
          title: "Breaking Bad: A Química do Mal",
          originalTitle: "Breaking Bad",
          originalLanguage: "en",
          releaseDate: "2008-01-20",
          overview: null,
          posterPath: "/bb.jpg",
        },
        {
          ref: { mediaType: "movie", externalId: "559969" },
          title: "El Camino",
          originalTitle: "El Camino: A Breaking Bad Movie",
          originalLanguage: "en",
          releaseDate: null,
          overview: "Sinopse.",
          posterPath: null,
        },
      ],
    });
  });

  it("resposta fora do formato: indisponível", () => {
    expect(() => mapSearch({ erro: true })).toThrow(CatalogUnavailableError);
  });
});

describe("mapMovie", () => {
  it("traduz o filme e o status", () => {
    expect(mapMovie(MOVIE, "pt-BR")).toEqual({
      ref: { mediaType: "movie", externalId: "603" },
      originalTitle: "The Matrix",
      originalLanguage: "en",
      releaseDate: "1999-03-31",
      runtime: 136,
      status: "released",
      backdropPath: "/fundo.jpg",
      translation: {
        locale: "pt-BR",
        title: "Matrix",
        overview: "Sinopse.",
        posterPath: "/matrix.jpg",
      },
      genres: [{ externalId: "28", name: "Ação" }],
      seasons: [],
    });
  });

  it("status desconhecido e duração zero viram unknown e null", () => {
    const movie = mapMovie(
      { ...MOVIE, status: "Algo novo", runtime: 0 },
      "pt-BR",
    );
    expect(movie.status).toBe("unknown");
    expect(movie.runtime).toBeNull();
  });
});

describe("createTmdbProvider", () => {
  it("busca com idioma e sem conteúdo adulto", async () => {
    const get = vi.fn(async () => SEARCH);
    const provider = createTmdbProvider({ get });
    await provider.search("breaking bad", 2, "pt-BR");
    expect(get).toHaveBeenCalledWith("search/multi", {
      query: "breaking bad",
      page: 2,
      language: "pt-BR",
      include_adult: false,
    });
  });

  it("filme inexistente: null", async () => {
    const provider = createTmdbProvider({ get: vi.fn(async () => null) });
    await expect(
      provider.fetchTitle({ mediaType: "movie", externalId: "1" }, "pt-BR"),
    ).resolves.toBeNull();
  });

  it("série: traz as temporadas em lotes de 20 com append_to_response", async () => {
    const numbers = Array.from({ length: 23 }, (_, i) => i); // 0 (especiais) a 22
    const get = vi.fn<TmdbClient["get"]>(async (_path, params = {}) => {
      const appended = params.append_to_response;
      if (!appended) return tvDetails(numbers);
      const response: Record<string, unknown> = tvDetails(numbers);
      for (const key of String(appended).split(",")) {
        response[key] = season(Number(key.split("/")[1]));
      }
      return response;
    });

    const title = await createTmdbProvider({ get }).fetchTitle(
      { mediaType: "tv", externalId: "1399" },
      "pt-BR",
    );

    expect(get).toHaveBeenCalledTimes(3);
    const appends = get.mock.calls
      .map(([, params]) => params?.append_to_response)
      .filter(Boolean)
      .map((value) => String(value).split(",").length);
    expect(appends).toEqual([20, 3]);
    expect(title?.status).toBe("ended");
    expect(title?.runtime).toBeNull();
    expect(title?.seasons.map((s) => s.seasonNumber)).toEqual(numbers);
    expect(title?.seasons[1]).toEqual({
      seasonNumber: 1,
      name: "Temporada 1",
      overview: null,
      airDate: "2011-04-17",
      posterPath: null,
      episodes: [
        {
          episodeNumber: 1,
          name: "Episódio 1",
          overview: null,
          airDate: "2011-04-17",
          runtime: 62,
        },
      ],
    });
  });

  it("série: descarta temporada ou episódio malformado e número repetido", async () => {
    const get = vi.fn<TmdbClient["get"]>(async (_path, params = {}) => {
      if (!params.append_to_response) return tvDetails([1, 2]);
      const good = season(1);
      good.episodes.push(
        { ...good.episodes[0], name: "Repetido" },
        { ...good.episodes[0], episode_number: null as unknown as number },
      );
      return {
        ...tvDetails([1, 2]),
        "season/1": good,
        "season/2": { season_number: "dois" },
      };
    });
    const title = await createTmdbProvider({ get }).fetchTitle(
      { mediaType: "tv", externalId: "1399" },
      "pt-BR",
    );
    expect(title?.seasons).toHaveLength(1);
    expect(title?.seasons[0].episodes).toEqual([
      expect.objectContaining({ episodeNumber: 1, name: "Repetido" }),
    ]);
  });

  it("série inexistente: null, sem buscar temporadas", async () => {
    const get = vi.fn(async () => null);
    const provider = createTmdbProvider({ get });
    await expect(
      provider.fetchTitle({ mediaType: "tv", externalId: "1" }, "pt-BR"),
    ).resolves.toBeNull();
    expect(get).toHaveBeenCalledOnce();
  });
});
