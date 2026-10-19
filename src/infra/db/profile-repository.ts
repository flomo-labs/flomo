import { and, eq, ne, sql } from "drizzle-orm";
import type {
  ProfileRepository,
  ProfileStats,
  ProfileView,
} from "@/domain/profile/ports";
import type { Tx } from "./client";
import { profiles } from "./schema";

const UNIQUE_VIOLATION = "23505";

// O Drizzle embrulha o erro do driver em `cause`.
function isUniqueViolation(error: unknown): boolean {
  const code = (e: unknown) =>
    typeof e === "object" && e !== null && "code" in e ? e.code : undefined;
  return (
    code(error) === UNIQUE_VIOLATION ||
    (error instanceof Error && code(error.cause) === UNIQUE_VIOLATION)
  );
}

// Mesma expressão do índice único profiles_handle_normalized_key.
const normalizedHandle = sql`replace(replace(${profiles.handle}, '.', ''), '_', '')`;

// Recebe a transação do `withUser`, nunca o cliente direto (ADR-003).
export function createProfileRepository(tx: Tx): ProfileRepository {
  return {
    async isHandleTaken(normalized, exceptUserId) {
      const rows = await tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(
          and(eq(normalizedHandle, normalized), ne(profiles.id, exceptUserId)),
        )
        .limit(1);
      return rows.length > 0;
    },

    async updateHandle(userId, handle) {
      try {
        // Savepoint: a violação do índice desfaz só este update, e a
        // transação do `withUser` continua utilizável.
        const rows = await tx.transaction((sp) =>
          sp
            .update(profiles)
            .set({ handle })
            .where(eq(profiles.id, userId))
            .returning({ id: profiles.id }),
        );
        return rows.length > 0 ? "updated" : "not_found";
      } catch (error) {
        if (isUniqueViolation(error)) return "taken";
        throw error;
      }
    },

    async findByHandle(handle) {
      const [row] = await tx.execute<{
        id: string;
        handle: string;
        display_name: string | null;
        bio: string | null;
        avatar_url: string | null;
        is_private: boolean;
        can_see_details: boolean;
      }>(sql`select * from app.profile_card(${handle})`);
      if (!row) return null;
      const view: ProfileView = {
        id: row.id,
        handle: row.handle,
        displayName: row.display_name,
        bio: row.bio,
        avatarUrl: row.avatar_url,
        isPrivate: row.is_private,
        canSeeDetails: row.can_see_details,
      };
      return view;
    },

    async getStats(profileId) {
      const [row] = await tx.execute<{
        series_count: number;
        movies_count: number;
        episodes_count: number;
        minutes_watched: string;
        ratings_count: number;
      }>(sql`select * from app.profile_stats(${profileId}::uuid)`);
      if (!row) return null;
      const stats: ProfileStats = {
        seriesCount: row.series_count,
        moviesCount: row.movies_count,
        episodesCount: row.episodes_count,
        // bigint chega como texto do driver.
        minutesWatched: Number(row.minutes_watched),
        ratingsCount: row.ratings_count,
      };
      return stats;
    },

    async updateDetails(userId, details) {
      const rows = await tx
        .update(profiles)
        .set(details)
        .where(eq(profiles.id, userId))
        .returning({ id: profiles.id });
      return rows.length > 0 ? "updated" : "not_found";
    },
  };
}

export type OwnProfile = {
  id: string;
  handle: string;
  displayName: string | null;
  bio: string | null;
  isPrivate: boolean;
  avatarUrl: string | null;
};

// Perfil do próprio usuário, para a borda decidir telas (ex.: primeiro acesso).
export async function findOwnProfile(
  tx: Tx,
  userId: string,
): Promise<OwnProfile | null> {
  const [row] = await tx
    .select({
      id: profiles.id,
      handle: profiles.handle,
      displayName: profiles.displayName,
      bio: profiles.bio,
      isPrivate: profiles.isPrivate,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.id, userId));
  return row ?? null;
}
