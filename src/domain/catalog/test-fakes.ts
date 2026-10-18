import { vi } from "vitest";
import type { CatalogDeps, CatalogProvider, CatalogStore } from "./ports";
import type {
  CatalogRef,
  CatalogTitle,
  ProviderTitle,
  SearchItem,
  SearchPage,
  WatchProviders,
} from "./types";

// Dublês dos testes de domínio do catálogo (sem banco nem rede).

export const NOW = new Date("2026-10-15T12:00:00Z");

export function providerTitle(
  overrides: Partial<ProviderTitle> = {},
): ProviderTitle {
  return {
    ref: { mediaType: "tv", externalId: "1399" },
    originalTitle: "Game of Thrones",
    originalLanguage: "en",
    releaseDate: "2011-04-17",
    runtime: 60,
    status: "ended",
    backdropPath: null,
    voteAverage: 8.4,
    voteCount: 25000,
    translation: {
      locale: "pt-BR",
      title: "A Guerra dos Tronos",
      overview: null,
      posterPath: "/poster.jpg",
    },
    genres: [{ externalId: "18", name: "Drama" }],
    seasons: [
      {
        seasonNumber: 1,
        name: "Temporada 1",
        overview: null,
        airDate: "2011-04-17",
        posterPath: null,
        episodes: [
          {
            episodeNumber: 1,
            name: "O Inverno Está Chegando",
            overview: null,
            airDate: "2011-04-17",
            runtime: 62,
          },
        ],
      },
    ],
    ...overrides,
  };
}

export function searchPage(title = "A Guerra dos Tronos"): SearchPage {
  return {
    page: 1,
    totalPages: 1,
    totalResults: 1,
    items: [
      {
        ref: { mediaType: "tv", externalId: "1399" },
        title,
        originalTitle: "Game of Thrones",
        originalLanguage: "en",
        releaseDate: "2011-04-17",
        overview: null,
        posterPath: null,
      },
    ],
  };
}

export function shelfItems(count = 2): SearchItem[] {
  return Array.from({ length: count }, (_, i) => ({
    ref: { mediaType: "tv" as const, externalId: String(100 + i) },
    title: `Série ${i + 1}`,
    originalTitle: `Show ${i + 1}`,
    originalLanguage: "en",
    releaseDate: "2024-01-01",
    overview: null,
    posterPath: `/s${i}.jpg`,
  }));
}

export function watchProviders(
  overrides: Partial<WatchProviders> = {},
): WatchProviders {
  return {
    country: "BR",
    link: "https://www.themoviedb.org/tv/1399/watch?locale=BR",
    flatrate: [{ id: "1899", name: "Max", logoPath: "/max.jpg" }],
    free: [],
    rent: [],
    buy: [],
    ...overrides,
  };
}

// Store em memória que imita o repositório do Postgres.
export function memoryStore() {
  const searches = new Map<string, { value: SearchPage; expiresAt: Date }>();
  const shelves = new Map<string, { value: SearchItem[]; expiresAt: Date }>();
  const providers = new Map<
    string,
    { value: WatchProviders; expiresAt: Date }
  >();
  const titles = new Map<
    string,
    { title: ProviderTitle; ref: CatalogRef; expiresAt: Date }
  >();
  const refKey = (ref: CatalogRef) => `${ref.mediaType}/${ref.externalId}`;
  const ids = new Map<string, string>();

  const store: CatalogStore = {
    async readSearch(key) {
      return searches.get(key) ?? null;
    },
    async writeSearch(key, value, expiresAt) {
      searches.set(key, { value, expiresAt });
    },
    async readShelf(key) {
      return shelves.get(key) ?? null;
    },
    async writeShelf(key, value, expiresAt) {
      shelves.set(key, { value, expiresAt });
    },
    async readWatchProviders(key) {
      return providers.get(key) ?? null;
    },
    async writeWatchProviders(key, value, expiresAt) {
      providers.set(key, { value, expiresAt });
    },
    async findTitleByRef(ref) {
      const id = ids.get(refKey(ref));
      if (!id) return null;
      return { id };
    },
    async postponeTitle(ref, expiresAt) {
      const id = ids.get(refKey(ref));
      const saved = id ? titles.get(id) : undefined;
      if (saved) saved.expiresAt = expiresAt;
    },
    async readTitle(id) {
      const saved = titles.get(id);
      if (!saved) return null;
      const t = saved.title;
      const title: CatalogTitle = {
        id,
        mediaType: t.ref.mediaType,
        title: t.translation.title,
        originalTitle: t.originalTitle,
        originalLanguage: t.originalLanguage,
        overview: t.translation.overview,
        releaseDate: t.releaseDate,
        runtime: t.runtime,
        status: t.status,
        posterPath: t.translation.posterPath,
        backdropPath: t.backdropPath,
        tmdbRating:
          t.voteAverage !== null && t.voteCount !== null
            ? { average: t.voteAverage, count: t.voteCount }
            : null,
        genres: t.genres.map((g) => g.name),
        seasons: t.seasons.map((s) => ({
          id: `${id}-s${s.seasonNumber}`,
          seasonNumber: s.seasonNumber,
          name: s.name,
          airDate: s.airDate,
          posterPath: s.posterPath,
          episodeCount: s.episodes.length,
        })),
      };
      return { value: { title, ref: saved.ref }, expiresAt: saved.expiresAt };
    },
    async writeTitle(title, expiresAt) {
      const key = refKey(title.ref);
      const id =
        ids.get(key) ??
        `00000000-0000-4000-8000-${String(ids.size + 1).padStart(12, "0")}`;
      ids.set(key, id);
      titles.set(id, { title, ref: title.ref, expiresAt });
      return id;
    },
    async readEpisodes(titleId, seasonNumber) {
      const season = titles
        .get(titleId)
        ?.title.seasons.find((s) => s.seasonNumber === seasonNumber);
      if (!season) return null;
      return season.episodes.map((e) => ({
        id: `${titleId}-s${seasonNumber}e${e.episodeNumber}`,
        ...e,
      }));
    },
  };
  return { store, searches, titles, providers, shelves };
}

export function fakeDeps(
  overrides: { provider?: Partial<CatalogProvider>; store?: CatalogStore } = {},
) {
  const provider: CatalogProvider = {
    search: vi.fn(async () => searchPage()),
    fetchTitle: vi.fn(async () => providerTitle()),
    fetchShelf: vi.fn(async () => shelfItems()),
    fetchWatchProviders: vi.fn(async () => watchProviders()),
    ...overrides.provider,
  };
  const memory = memoryStore();
  const tasks: (() => Promise<unknown>)[] = [];
  const deps: CatalogDeps = {
    provider,
    store: overrides.store ?? memory.store,
    now: () => NOW,
    background: (task) => {
      tasks.push(task);
    },
  };
  // Executa o que foi agendado para depois da resposta.
  const runBackground = async () => {
    for (const task of tasks.splice(0)) await task();
  };
  return { deps, provider, memory, tasks, runBackground };
}
