import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import type {
  RatingGroup,
  RatingRepository,
} from "@/domain/rating/ports";
import type { Db, Tx } from "./client";
import { ratings } from "./schema";

// `Db` basta para a média pública (sem login); o resto roda no `withUser`.
export function createRatingRepository(tx: Tx | Db): RatingRepository {
  return {
    async upsertMovieRating(userId, titleId, halfStars) {
      await tx
        .insert(ratings)
        .values({ userId, titleId, episodeId: null, halfStars })
        .onConflictDoUpdate({
          target: [ratings.userId, ratings.titleId],
          targetWhere: isNull(ratings.episodeId),
          set: { halfStars },
        });
    },
    async upsertEpisodeRating(userId, titleId, episodeId, halfStars) {
      await tx
        .insert(ratings)
        .values({ userId, titleId, episodeId, halfStars })
        .onConflictDoUpdate({
          target: [ratings.userId, ratings.episodeId],
          targetWhere: isNotNull(ratings.episodeId),
          set: { halfStars },
        });
    },
    async deleteMovieRating(userId, titleId) {
      await tx
        .delete(ratings)
        .where(
          and(
            eq(ratings.userId, userId),
            eq(ratings.titleId, titleId),
            isNull(ratings.episodeId),
          ),
        );
    },
    async deleteEpisodeRating(userId, episodeId) {
      await tx
        .delete(ratings)
        .where(
          and(eq(ratings.userId, userId), eq(ratings.episodeId, episodeId)),
        );
    },
    async listUserRatings(userId, titleId) {
      return tx
        .select({ episodeId: ratings.episodeId, halfStars: ratings.halfStars })
        .from(ratings)
        .where(and(eq(ratings.userId, userId), eq(ratings.titleId, titleId)));
    },
    async summarizeTitle(titleId): Promise<RatingGroup[]> {
      const rows = await tx.execute<{
        season_number: number | null;
        average: string;
        ratings_count: number;
      }>(sql`select * from app.title_rating_summary(${titleId}::uuid)`);
      return [...rows].map((r) => ({
        seasonNumber: r.season_number,
        average: Number(r.average),
        count: r.ratings_count,
      }));
    },
  };
}
