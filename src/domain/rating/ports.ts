import type { LibraryRepository } from "../library/ports";

// Porta das notas, implementada em infra/ (ADR-001). Dentro do `withUser`, o
// RLS limita as notas lidas e gravadas às do próprio usuário.

// Nota do usuário: `episodeId` nulo = nota do filme.
export type UserRating = { episodeId: string | null; halfStars: number };

// Notas de todos os usuários agrupadas por temporada (`seasonNumber` nulo =
// nota de filme), só agregados: nunca uma nota nem quem a deu.
export type RatingGroup = {
  seasonNumber: number | null;
  // Soma das meias estrelas dividida pela quantidade (1 a 10).
  average: number;
  count: number;
};

// Média e quantidade das notas de um episódio, de todos os usuários.
export type EpisodeRatingGroup = {
  episodeId: string;
  average: number;
  count: number;
};

export interface RatingRepository {
  // Grava a nota atual do filme ou do episódio, trocando a anterior.
  upsertMovieRating(
    userId: string,
    titleId: string,
    halfStars: number,
  ): Promise<void>;
  upsertEpisodeRating(
    userId: string,
    titleId: string,
    episodeId: string,
    halfStars: number,
  ): Promise<void>;

  deleteMovieRating(userId: string, titleId: string): Promise<void>;
  deleteEpisodeRating(userId: string, episodeId: string): Promise<void>;

  // Notas do usuário num título: a do filme ou as dos episódios.
  listUserRatings(userId: string, titleId: string): Promise<UserRating[]>;

  // Agregados do título somando todos os usuários (função
  // app.title_rating_summary). Roda também sem login.
  summarizeTitle(titleId: string): Promise<RatingGroup[]>;
  // O mesmo por episódio (app.title_episode_rating_summary), só os que têm nota.
  summarizeEpisodes(titleId: string): Promise<EpisodeRatingGroup[]>;
}

// A regra "só se avalia o que foi assistido" usa o estado da biblioteca.
export type RatingDeps = {
  ratings: RatingRepository;
  library: Pick<
    LibraryRepository,
    "findEpisode" | "findTitleMediaType" | "hasMovieEvent" | "hasEpisodeProgress"
  >;
};
