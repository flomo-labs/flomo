import type { MediaType } from "../catalog/types";
import { createFakeLibrary, type FakeEpisode } from "../library/test-fakes";
import type {
  EpisodeRatingGroup,
  RatingDeps,
  RatingGroup,
  RatingRepository,
  UserRating,
} from "./ports";

// Notas em memória para os testes de domínio (sem banco), sobre a biblioteca
// em memória. Imita o que o banco garante: uma nota por filme e por episódio.
export function createFakeRatings(catalog: {
  titles?: Record<string, MediaType>;
  episodes?: FakeEpisode[];
}) {
  const library = createFakeLibrary(catalog);
  const episodes = catalog.episodes ?? [];
  type Stored = { userId: string; titleId: string; episodeId: string | null; halfStars: number };
  const rows: Stored[] = [];

  const put = (row: Stored) => {
    const i = rows.findIndex(
      (r) => r.userId === row.userId && r.titleId === row.titleId && r.episodeId === row.episodeId,
    );
    if (i >= 0) rows[i] = row;
    else rows.push(row);
  };

  const repo: RatingRepository = {
    async upsertMovieRating(userId, titleId, halfStars) {
      put({ userId, titleId, episodeId: null, halfStars });
    },
    async upsertEpisodeRating(userId, titleId, episodeId, halfStars) {
      put({ userId, titleId, episodeId, halfStars });
    },
    async deleteMovieRating(userId, titleId) {
      const i = rows.findIndex((r) => r.userId === userId && r.titleId === titleId && r.episodeId === null);
      if (i >= 0) rows.splice(i, 1);
    },
    async deleteEpisodeRating(userId, episodeId) {
      const i = rows.findIndex((r) => r.userId === userId && r.episodeId === episodeId);
      if (i >= 0) rows.splice(i, 1);
    },
    async listUserRatings(userId, titleId): Promise<UserRating[]> {
      return rows
        .filter((r) => r.userId === userId && r.titleId === titleId)
        .map((r) => ({ episodeId: r.episodeId, halfStars: r.halfStars }));
    },
    async summarizeTitle(titleId): Promise<RatingGroup[]> {
      const groups = new Map<number | null, number[]>();
      for (const r of rows.filter((x) => x.titleId === titleId)) {
        const season = r.episodeId
          ? (episodes.find((e) => e.id === r.episodeId)?.seasonNumber ?? null)
          : null;
        groups.set(season, [...(groups.get(season) ?? []), r.halfStars]);
      }
      return [...groups].map(([seasonNumber, values]) => ({
        seasonNumber,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length,
      }));
    },
    async summarizeEpisodes(titleId): Promise<EpisodeRatingGroup[]> {
      const groups = new Map<string, number[]>();
      for (const r of rows.filter((x) => x.titleId === titleId && x.episodeId)) {
        groups.set(r.episodeId!, [...(groups.get(r.episodeId!) ?? []), r.halfStars]);
      }
      return [...groups].map(([episodeId, values]) => ({
        episodeId,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length,
      }));
    },
  };

  const deps: RatingDeps = { ratings: repo, library: library.deps.library };
  return { deps, library, rows };
}
