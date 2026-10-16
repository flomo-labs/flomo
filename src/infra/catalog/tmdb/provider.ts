import { z } from "zod";
import {
  CatalogUnavailableError,
  type CatalogProvider,
} from "@/domain/catalog/ports";
import type {
  CatalogRef,
  ProviderEpisode,
  ProviderSeason,
  ProviderTitle,
  SearchItem,
  SearchPage,
  TitleStatus,
  WatchProvider,
  WatchProviders,
} from "@/domain/catalog/types";
import type { TmdbClient } from "./client";

// Adaptador do TMDB para a porta `CatalogProvider`: traduz as respostas da
// API para os tipos do domínio, guardando só os campos que o Flomo usa.

export const TMDB_PROVIDER = "tmdb";

// O TMDB aceita até 20 itens em `append_to_response`: as temporadas vêm em
// lotes de 20 por chamada.
const SEASONS_PER_REQUEST = 20;

// O TMDB manda "" quando não tem o dado.
const optionalText = z
  .string()
  .nullish()
  .transform((value) => (value ? value : null));
const optionalDate = z
  .string()
  .nullish()
  .transform((value) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null,
  );
const optionalMinutes = z
  .number()
  .nullish()
  .transform((value) =>
    typeof value === "number" && value > 0 ? Math.round(value) : null,
  );

const searchResultSchema = z.object({
  page: z.number(),
  total_pages: z.number(),
  total_results: z.number(),
  results: z.array(z.looseObject({ media_type: z.string().optional() })),
});

const searchMovieSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  original_title: z.string(),
  original_language: optionalText,
  release_date: optionalDate,
  overview: optionalText,
  poster_path: optionalText,
});

const searchTvSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  original_name: z.string(),
  original_language: optionalText,
  first_air_date: optionalDate,
  overview: optionalText,
  poster_path: optionalText,
});

const genreSchema = z.object({ id: z.number().int(), name: z.string() });

const movieSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  original_title: z.string(),
  original_language: optionalText,
  release_date: optionalDate,
  runtime: optionalMinutes,
  status: optionalText,
  overview: optionalText,
  poster_path: optionalText,
  backdrop_path: optionalText,
  genres: z.array(genreSchema).default([]),
});

const tvSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  original_name: z.string(),
  original_language: optionalText,
  first_air_date: optionalDate,
  episode_run_time: z.array(z.number()).default([]),
  status: optionalText,
  overview: optionalText,
  poster_path: optionalText,
  backdrop_path: optionalText,
  genres: z.array(genreSchema).default([]),
  seasons: z
    .array(z.object({ season_number: z.number().int().nonnegative() }))
    .default([]),
});

const episodeSchema = z.object({
  episode_number: z.number().int().nonnegative(),
  name: optionalText,
  overview: optionalText,
  air_date: optionalDate,
  runtime: optionalMinutes,
});

const seasonSchema = z.object({
  season_number: z.number().int().nonnegative(),
  name: optionalText,
  overview: optionalText,
  air_date: optionalDate,
  poster_path: optionalText,
  // Validados um a um em `mapSeason`.
  episodes: z.array(z.unknown()).default([]),
});

// Status do TMDB -> status do Flomo.
const MOVIE_STATUS: Record<string, TitleStatus> = {
  Rumored: "planned",
  Planned: "planned",
  "In Production": "in_production",
  "Post Production": "in_production",
  Released: "released",
  Canceled: "canceled",
};
const TV_STATUS: Record<string, TitleStatus> = {
  Planned: "planned",
  Pilot: "in_production",
  "In Production": "in_production",
  "Returning Series": "returning",
  Ended: "ended",
  Canceled: "canceled",
};

function parse<T>(schema: z.ZodType<T>, data: unknown, path: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new CatalogUnavailableError(
      `Resposta inesperada do TMDB em ${path}.`,
      { cause: result.error },
    );
  }
  return result.data;
}

export function mapSearch(data: unknown): SearchPage {
  const raw = parse(searchResultSchema, data, "search/multi");
  const items: SearchItem[] = [];
  // Pessoas também aparecem na busca multi; o catálogo ainda não tem
  // pessoas. Itens malformados são ignorados, sem derrubar a busca.
  for (const result of raw.results) {
    if (result.media_type === "movie") {
      const movie = searchMovieSchema.safeParse(result);
      if (!movie.success) continue;
      items.push({
        ref: { mediaType: "movie", externalId: String(movie.data.id) },
        title: movie.data.title || movie.data.original_title,
        originalTitle: movie.data.original_title,
        originalLanguage: movie.data.original_language,
        releaseDate: movie.data.release_date,
        overview: movie.data.overview,
        posterPath: movie.data.poster_path,
      });
    } else if (result.media_type === "tv") {
      const tv = searchTvSchema.safeParse(result);
      if (!tv.success) continue;
      items.push({
        ref: { mediaType: "tv", externalId: String(tv.data.id) },
        title: tv.data.name || tv.data.original_name,
        originalTitle: tv.data.original_name,
        originalLanguage: tv.data.original_language,
        releaseDate: tv.data.first_air_date,
        overview: tv.data.overview,
        posterPath: tv.data.poster_path,
      });
    }
  }
  return {
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
    items,
  };
}

export function mapMovie(data: unknown, locale: string): ProviderTitle {
  const movie = parse(movieSchema, data, "movie");
  return {
    ref: { mediaType: "movie", externalId: String(movie.id) },
    originalTitle: movie.original_title,
    originalLanguage: movie.original_language,
    releaseDate: movie.release_date,
    runtime: movie.runtime,
    status: (movie.status && MOVIE_STATUS[movie.status]) || "unknown",
    backdropPath: movie.backdrop_path,
    translation: {
      locale,
      title: movie.title || movie.original_title,
      overview: movie.overview,
      posterPath: movie.poster_path,
    },
    genres: movie.genres.map((g) => ({
      externalId: String(g.id),
      name: g.name,
    })),
    seasons: [],
  };
}

// Dado malformado numa temporada ou num episódio descarta só aquele item,
// sem derrubar a série inteira (como na busca). Número de episódio repetido
// fica com a última ocorrência.
function mapSeason(data: unknown): ProviderSeason | null {
  const parsed = seasonSchema.safeParse(data);
  if (!parsed.success) return null;
  const season = parsed.data;
  const byNumber = new Map<number, ProviderEpisode>();
  for (const raw of season.episodes) {
    const episode = episodeSchema.safeParse(raw);
    if (!episode.success) continue;
    const e = episode.data;
    byNumber.set(e.episode_number, {
      episodeNumber: e.episode_number,
      name: e.name,
      overview: e.overview,
      airDate: e.air_date,
      runtime: e.runtime,
    });
  }
  return {
    seasonNumber: season.season_number,
    name: season.name,
    overview: season.overview,
    airDate: season.air_date,
    posterPath: season.poster_path,
    episodes: [...byNumber.values()].sort(
      (a, b) => a.episodeNumber - b.episodeNumber,
    ),
  };
}

// `details` é a resposta de `tv/{id}`; `appended` junta as respostas que
// trouxeram as temporadas (`season/N` em `append_to_response`).
export function mapTv(
  details: unknown,
  appended: Record<string, unknown>,
  locale: string,
): ProviderTitle {
  const tv = parse(tvSchema, details, "tv");
  const runtimes = tv.episode_run_time.filter((m) => m > 0);
  const seasons = tv.seasons
    .map((s) => appended[`season/${s.season_number}`])
    .map(mapSeason)
    .filter((season) => season !== null);
  return {
    ref: { mediaType: "tv", externalId: String(tv.id) },
    originalTitle: tv.original_name,
    originalLanguage: tv.original_language,
    releaseDate: tv.first_air_date,
    runtime: runtimes.length > 0 ? Math.round(Math.min(...runtimes)) : null,
    status: (tv.status && TV_STATUS[tv.status]) || "unknown",
    backdropPath: tv.backdrop_path,
    translation: {
      locale,
      title: tv.name || tv.original_name,
      overview: tv.overview,
      posterPath: tv.poster_path,
    },
    genres: tv.genres.map((g) => ({ externalId: String(g.id), name: g.name })),
    seasons,
  };
}

const watchProviderSchema = z.object({
  provider_id: z.number().int().positive(),
  provider_name: z.string().min(1),
  logo_path: optionalText,
  display_priority: z.number().nullish(),
});

function asArray(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

// Cada lista é validada item a item: um provedor malformado some, sem derrubar
// os demais.
function mapProviderList(raw: unknown): WatchProvider[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((item) => {
      const parsed = watchProviderSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    })
    .sort(
      (a, b) =>
        (a.display_priority ?? Infinity) - (b.display_priority ?? Infinity),
    )
    .map((p) => ({
      id: String(p.provider_id),
      name: p.provider_name,
      logoPath: p.logo_path,
    }));
}

const watchProvidersSchema = z.object({
  results: z.record(z.string(), z.unknown()).default({}),
});

// Só aceita o link da página do TMDB (vai para um <a href>).
function tmdbLink(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname === "www.themoviedb.org"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function mapWatchProviders(
  data: unknown,
  country: string,
): WatchProviders {
  const { results } = parse(watchProvidersSchema, data, "watch/providers");
  const entry = results[country];
  const offer =
    entry && typeof entry === "object"
      ? (entry as Record<string, unknown>)
      : {};
  return {
    country,
    link: tmdbLink(offer.link),
    flatrate: mapProviderList(offer.flatrate),
    // O TMDB pode listar o mesmo serviço em `free` e em `ads`.
    free: mapProviderList([
      ...asArray(offer.free),
      ...asArray(offer.ads),
    ]).filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i),
    rent: mapProviderList(offer.rent),
    buy: mapProviderList(offer.buy),
  };
}

function seasonNumbersOf(details: unknown): number[] {
  return parse(tvSchema, details, "tv").seasons.map((s) => s.season_number);
}

export function createTmdbProvider(client: TmdbClient): CatalogProvider {
  async function fetchTv(ref: CatalogRef, locale: string) {
    const details = await client.get(`tv/${ref.externalId}`, {
      language: locale,
    });
    if (details === null) return null;

    // Episódios vêm por temporada: até 20 temporadas por chamada, em
    // paralelo, sob o limite de concorrência do cliente.
    const numbers = seasonNumbersOf(details);
    const batches: number[][] = [];
    for (let i = 0; i < numbers.length; i += SEASONS_PER_REQUEST) {
      batches.push(numbers.slice(i, i + SEASONS_PER_REQUEST));
    }
    const responses = await Promise.all(
      batches.map((batch) =>
        client.get(`tv/${ref.externalId}`, {
          language: locale,
          append_to_response: batch.map((n) => `season/${n}`).join(","),
        }),
      ),
    );
    const appended: Record<string, unknown> = {};
    for (const response of responses) {
      if (response && typeof response === "object") {
        Object.assign(appended, response);
      }
    }
    return mapTv(details, appended, locale);
  }

  return {
    async search(query, page, locale) {
      const data = await client.get("search/multi", {
        query,
        page,
        language: locale,
        include_adult: false,
      });
      if (data === null) {
        throw new CatalogUnavailableError("Busca do TMDB indisponível.");
      }
      return mapSearch(data);
    },

    async fetchTitle(ref, locale) {
      if (ref.mediaType === "tv") return fetchTv(ref, locale);
      const data = await client.get(`movie/${ref.externalId}`, {
        language: locale,
      });
      return data === null ? null : mapMovie(data, locale);
    },

    async fetchWatchProviders(ref, country) {
      const data = await client.get(
        `${ref.mediaType}/${ref.externalId}/watch/providers`,
      );
      return data === null ? null : mapWatchProviders(data, country);
    },
  };
}
