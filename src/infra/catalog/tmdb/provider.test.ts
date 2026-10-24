import { describe, expect, it, vi } from "vitest";
import { CatalogUnavailableError } from "@/domain/catalog/ports";
import type { TmdbClient } from "./client";
import {
  createTmdbProvider,
  mapMovie,
  mapSearch,
  mapShelf,
  mapWatchProviders,
} from "./provider";

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
  vote_average: 8.2063,
  vote_count: 25000,
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
      voteAverage: 8.2,
      voteCount: 25000,
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

  it("sem voto (0 e 0), nota fora de 0 a 10 ou campo ausente: sem nota do TMDB", () => {
    for (const vote of [
      { vote_average: 0, vote_count: 0 },
      { vote_average: 11, vote_count: 5 },
      { vote_average: -1, vote_count: 5 },
      { vote_average: 7, vote_count: null },
      { vote_average: null, vote_count: 5 },
      {},
    ]) {
      const movie = mapMovie(
        { ...MOVIE, vote_average: undefined, vote_count: undefined, ...vote },
        "pt-BR",
      );
      expect([movie.voteAverage, movie.voteCount]).toEqual([null, null]);
    }
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

describe("mapWatchProviders", () => {
  const RESPONSE = {
    id: 603,
    results: {
      BR: {
        link: "https://www.themoviedb.org/movie/603-the-matrix/watch?locale=BR",
        flatrate: [
          {
            logo_path: "/b.jpg",
            provider_id: 2,
            provider_name: "B",
            display_priority: 5,
          },
          {
            logo_path: "/a.jpg",
            provider_id: 1,
            provider_name: "A",
            display_priority: 1,
          },
          { provider_id: "quebrado" },
        ],
        ads: [
          {
            logo_path: null,
            provider_id: 3,
            provider_name: "C",
            display_priority: 2,
          },
        ],
        rent: [{ logo_path: "/d.jpg", provider_id: 4, provider_name: "D" }],
      },
      US: {
        flatrate: [{ provider_id: 9, provider_name: "Z", logo_path: "/z.jpg" }],
      },
    },
  };

  it("usa só o país pedido, ordena por prioridade e ignora itens malformados", () => {
    expect(mapWatchProviders(RESPONSE, "BR")).toEqual({
      country: "BR",
      link: "https://www.themoviedb.org/movie/603-the-matrix/watch?locale=BR",
      flatrate: [
        { id: "1", name: "A", logoPath: "/a.jpg" },
        { id: "2", name: "B", logoPath: "/b.jpg" },
      ],
      free: [{ id: "3", name: "C", logoPath: null }],
      rent: [{ id: "4", name: "D", logoPath: "/d.jpg" }],
      buy: [],
    });
  });

  it("serviço repetido em free e ads aparece uma vez", () => {
    const item = { logo_path: "/c.jpg", provider_id: 3, provider_name: "C" };
    const data = { results: { BR: { free: [item], ads: [item] } } };
    expect(mapWatchProviders(data, "BR").free).toHaveLength(1);
  });

  it("país sem oferta: listas vazias e sem link", () => {
    expect(mapWatchProviders({ id: 1, results: {} }, "BR")).toEqual({
      country: "BR",
      link: null,
      flatrate: [],
      free: [],
      rent: [],
      buy: [],
    });
  });

  it("descarta link que não seja do TMDB", () => {
    const data = { results: { BR: { link: "https://evil.example/x" } } };
    expect(mapWatchProviders(data, "BR").link).toBeNull();
    const js = { results: { BR: { link: "javascript:alert(1)" } } };
    expect(mapWatchProviders(js, "BR").link).toBeNull();
  });

  it("resposta fora do formato: indisponível", () => {
    expect(() => mapWatchProviders("x", "BR")).toThrow(CatalogUnavailableError);
  });
});

describe("fetchWatchProviders", () => {
  it("chama o endpoint do tipo certo; 404 vira null", async () => {
    const get = vi.fn(async (path: string) =>
      path.startsWith("tv/") ? { id: 1, results: {} } : null,
    );
    const provider = createTmdbProvider({ get });
    expect(
      await provider.fetchWatchProviders(
        { mediaType: "tv", externalId: "1" },
        "BR",
      ),
    ).toMatchObject({ country: "BR" });
    expect(get).toHaveBeenCalledWith("tv/1/watch/providers");
    expect(
      await provider.fetchWatchProviders(
        { mediaType: "movie", externalId: "2" },
        "BR",
      ),
    ).toBeNull();
  });
});

describe("mapShelf", () => {
  const item = (id: number, extra: Record<string, unknown> = {}) => ({
    id,
    title: `Filme ${id}`,
    original_title: `Movie ${id}`,
    original_language: "en",
    release_date: "2024-01-01",
    overview: "",
    poster_path: `/p${id}.jpg`,
    ...extra,
  });
  const page = (results: unknown[]) => ({
    page: 1,
    total_pages: 1,
    total_results: results.length,
    results,
  });

  it("usa o tipo da consulta quando o item não traz media_type", () => {
    const items = mapShelf(page([item(1), item(2)]), "movie", 10, "x");
    expect(items.map((i) => i.ref)).toEqual([
      { mediaType: "movie", externalId: "1" },
      { mediaType: "movie", externalId: "2" },
    ]);
  });

  it("trending: respeita media_type de cada item e ignora pessoas", () => {
    const tv = {
      media_type: "tv",
      id: 9,
      name: "Série",
      original_name: "Show",
      poster_path: "/s.jpg",
    };
    const data = page([
      { ...item(1), media_type: "movie" },
      tv,
      { media_type: "person", id: 5, name: "Alguém", poster_path: "/x.jpg" },
    ]);
    expect(mapShelf(data, null, 10, "x").map((i) => i.ref.mediaType)).toEqual([
      "movie",
      "tv",
    ]);
  });

  it("adult nulo ou ausente não derruba a prateleira", () => {
    const data = page([item(1, { adult: null }), item(2)]);
    expect(mapShelf(data, "movie", 10, "x")).toHaveLength(2);
  });

  it("descarta conteúdo adulto e itens sem pôster, e corta no limite", () => {
    const data = page([
      item(1, { adult: true }),
      item(2, { poster_path: null }),
      item(3),
      item(4),
      item(5),
    ]);
    const items = mapShelf(data, "movie", 2, "x");
    expect(items.map((i) => i.ref.externalId)).toEqual(["3", "4"]);
  });

  it("resposta fora do formato: indisponível", () => {
    expect(() => mapShelf({ erro: 1 }, "movie", 10, "x")).toThrow(
      CatalogUnavailableError,
    );
  });
});

describe("fetchShelf", () => {
  const results = { page: 1, total_pages: 1, total_results: 0, results: [] };

  it("monta a consulta de cada prateleira", async () => {
    const get = vi.fn(async () => results);
    const provider = createTmdbProvider({ get });
    await provider.fetchShelf({ kind: "trending" }, "BR", "pt-BR", 10);
    await provider.fetchShelf({ kind: "now_playing" }, "BR", "pt-BR", 10);
    await provider.fetchShelf(
      { kind: "provider", mediaType: "tv", providerId: "8" },
      "BR",
      "pt-BR",
      10,
    );
    expect(get).toHaveBeenNthCalledWith(1, "trending/all/week", {
      language: "pt-BR",
      include_adult: false,
    });
    expect(get).toHaveBeenNthCalledWith(2, "movie/now_playing", {
      language: "pt-BR",
      include_adult: false,
      region: "BR",
    });
    expect(get).toHaveBeenNthCalledWith(3, "discover/tv", {
      language: "pt-BR",
      include_adult: false,
      watch_region: "BR",
      with_watch_providers: "8",
      with_watch_monetization_types: "flatrate",
      sort_by: "popularity.desc",
    });
  });

  it("novelas no serviço: une Soap e telenovela só nos países seguros, sem repetidos", async () => {
    const tv = (id: number, popularity: number) => ({
      id,
      name: `N${id}`,
      original_name: `N${id}`,
      poster_path: `/n${id}.jpg`,
      popularity,
    });
    const get = vi.fn(
      async (_path: string, params?: Record<string, unknown>) => ({
        ...results,
        results:
          params?.with_genres !== undefined
            ? [tv(1, 5), tv(2, 50)]
            : [tv(3, 20), tv(2, 50)],
      }),
    );
    const provider = createTmdbProvider({ get });
    const items = await provider.fetchShelf(
      { kind: "provider", mediaType: "novelas", providerId: "8" },
      "BR",
      "pt-BR",
      10,
    );
    expect(items.map((i) => i.ref.externalId)).toEqual(["2", "3", "1"]);
    const countries = "BR|MX|AR|CO|CL|PE|VE|PT|ES";
    expect(get).toHaveBeenCalledWith("discover/tv", {
      language: "pt-BR",
      include_adult: false,
      watch_region: "BR",
      with_watch_providers: "8",
      with_watch_monetization_types: "flatrate",
      with_origin_country: countries,
      sort_by: "popularity.desc",
      with_genres: 10766,
    });
    expect(get).toHaveBeenCalledWith("discover/tv", {
      language: "pt-BR",
      include_adult: false,
      watch_region: "BR",
      with_watch_providers: "8",
      with_watch_monetization_types: "flatrate",
      with_origin_country: countries,
      sort_by: "popularity.desc",
      with_keywords: 199262,
    });
  });

  it("novelas: falha se o TMDB não responde", async () => {
    const provider = createTmdbProvider({ get: vi.fn(async () => null) });
    await expect(
      provider.fetchShelf(
        { kind: "provider", mediaType: "novelas", providerId: "8" },
        "BR",
        "pt-BR",
        10,
      ),
    ).rejects.toThrow(CatalogUnavailableError);
  });

  it("animes no serviço: séries e filmes de Animação do Japão, por popularidade", async () => {
    const get = vi.fn(async (path: string) => ({
      ...results,
      results:
        path === "discover/movie"
          ? [
              { id: 1, title: "F1", original_title: "M1", poster_path: "/m1.jpg", popularity: 40 },
            ]
          : [
              { id: 7, name: "S7", original_name: "T7", poster_path: "/t7.jpg", popularity: 90 },
              { id: 8, name: "S8", original_name: "T8", poster_path: "/t8.jpg", popularity: 10 },
            ],
    }));
    const provider = createTmdbProvider({ get });
    const items = await provider.fetchShelf(
      { kind: "provider", mediaType: "animes", providerId: "8" },
      "BR",
      "pt-BR",
      10,
    );
    expect(items.map((i) => `${i.ref.mediaType}${i.ref.externalId}`)).toEqual([
      "tv7",
      "movie1",
      "tv8",
    ]);
    for (const path of ["discover/movie", "discover/tv"]) {
      expect(get).toHaveBeenCalledWith(path, {
        language: "pt-BR",
        include_adult: false,
        watch_region: "BR",
        with_watch_providers: "8",
        with_watch_monetization_types: "flatrate",
        sort_by: "popularity.desc",
        with_genres: 16,
        with_origin_country: "JP",
      });
    }
  });

  it("animes: falha se o TMDB não responde", async () => {
    const provider = createTmdbProvider({ get: vi.fn(async () => null) });
    await expect(
      provider.fetchShelf(
        { kind: "provider", mediaType: "animes", providerId: "8" },
        "BR",
        "pt-BR",
        10,
      ),
    ).rejects.toThrow(CatalogUnavailableError);
  });

  it("serviço com filmes e séries (all) ordena pela popularidade do TMDB", async () => {
    const movie = (id: number, popularity: number) => ({
      id,
      title: `F${id}`,
      original_title: `M${id}`,
      poster_path: `/m${id}.jpg`,
      popularity,
    });
    const show = (id: number, popularity: number) => ({
      id,
      name: `S${id}`,
      original_name: `T${id}`,
      poster_path: `/t${id}.jpg`,
      popularity,
    });
    const get = vi.fn(async (path: string) => ({
      ...results,
      results:
        path === "discover/movie"
          ? [movie(1, 50), movie(2, 10)]
          : [show(7, 30), show(8, 80)],
    }));
    const provider = createTmdbProvider({ get });
    const items = await provider.fetchShelf(
      { kind: "provider", mediaType: "all", providerId: "8" },
      "BR",
      "pt-BR",
      3,
    );
    expect(items.map((i) => `${i.ref.mediaType}${i.ref.externalId}`)).toEqual([
      "tv8",
      "movie1",
      "tv7",
    ]);
  });

  it("404 vira indisponível", async () => {
    const provider = createTmdbProvider({ get: vi.fn(async () => null) });
    await expect(
      provider.fetchShelf({ kind: "trending" }, "BR", "pt-BR", 10),
    ).rejects.toThrow(CatalogUnavailableError);
  });
});
