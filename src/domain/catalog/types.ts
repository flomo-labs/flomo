import type { MediaType, ShelfQuery } from "@/contracts/catalog";

export type { MediaType, ShelfQuery };

// Idioma em que o catálogo é exibido. Título e idioma originais são
// guardados à parte (Plano v2, decisão 11).
export const CATALOG_LOCALE = "pt-BR";
// País de onde o Flomo mostra "onde assistir" (Brasil primeiro, Plano v2).
export const CATALOG_COUNTRY = "BR";

// Situação do título, independente do provedor (o adaptador traduz).
export const TITLE_STATUSES = [
  "planned",
  "in_production",
  "released",
  "returning",
  "ended",
  "canceled",
  "unknown",
] as const;
export type TitleStatus = (typeof TITLE_STATUSES)[number];

export type CatalogRef = { mediaType: MediaType; externalId: string };

export type SearchItem = {
  ref: CatalogRef;
  title: string;
  originalTitle: string;
  originalLanguage: string | null;
  releaseDate: string | null; // AAAA-MM-DD
  overview: string | null;
  posterPath: string | null;
};

export type SearchPage = {
  page: number;
  totalPages: number;
  totalResults: number;
  items: SearchItem[];
};

// Título como o provedor entrega, já normalizado pelo adaptador e só com os
// campos que o Flomo usa.
export type ProviderEpisode = {
  episodeNumber: number;
  name: string | null;
  overview: string | null;
  airDate: string | null;
  runtime: number | null;
};

export type ProviderSeason = {
  seasonNumber: number;
  name: string | null;
  overview: string | null;
  airDate: string | null;
  posterPath: string | null;
  episodes: ProviderEpisode[];
};

export type ProviderTitle = {
  ref: CatalogRef;
  originalTitle: string;
  originalLanguage: string | null;
  releaseDate: string | null;
  runtime: number | null; // minutos (séries: duração típica do episódio)
  status: TitleStatus;
  backdropPath: string | null;
  // Nota do público no provedor (0 a 10) e quantos votos a formam; nulos
  // quando o título ainda não tem voto.
  voteAverage: number | null;
  voteCount: number | null;
  translation: {
    locale: string;
    title: string;
    overview: string | null;
    posterPath: string | null;
  };
  genres: { externalId: string; name: string }[];
  seasons: ProviderSeason[];
};

// Leitura do catálogo pelo Flomo (uuid próprio).
export type SeasonSummary = {
  id: string;
  seasonNumber: number;
  name: string | null;
  airDate: string | null;
  posterPath: string | null;
  episodeCount: number;
};

export type CatalogTitle = {
  id: string;
  mediaType: MediaType;
  title: string;
  originalTitle: string;
  originalLanguage: string | null;
  overview: string | null;
  releaseDate: string | null;
  runtime: number | null;
  status: TitleStatus;
  posterPath: string | null;
  backdropPath: string | null;
  // Nota do público no TMDB (0 a 10), à parte da nota do Flomo.
  tmdbRating: { average: number; count: number } | null;
  genres: string[];
  seasons: SeasonSummary[];
};

export type CatalogEpisode = {
  id: string;
  episodeNumber: number;
  name: string | null;
  overview: string | null;
  airDate: string | null;
  runtime: number | null;
};

// Onde assistir num país (JustWatch, via TMDB). `link` é a página do título
// no TMDB com a lista completa; a atribuição ao JustWatch é obrigatória.
export type WatchProvider = {
  id: string;
  name: string;
  logoPath: string | null;
};

export type WatchProviders = {
  country: string;
  link: string | null;
  flatrate: WatchProvider[]; // assinatura
  free: WatchProvider[]; // grátis, com ou sem anúncios
  rent: WatchProvider[];
  buy: WatchProvider[];
};

// Prateleira da tela Descobrir: lista de referências (como os resultados de busca), sem
// uuid; cada prateleira mostra no máximo isto.
export const SHELF_SIZE = 10;
