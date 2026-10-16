import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import type { LibraryRepository, WatchedItem } from "@/domain/library/ports";
import {
  type LibraryStatus,
  PROGRESS_PRECISIONS,
  type WatchedAtPrecision,
} from "@/domain/library/values";
import type { Tx } from "./client";
import {
  episodes,
  seasons,
  titles,
  userEpisodeProgress,
  userTitles,
  watchEvents,
} from "./schema";

// Recebe a transação do `withUser`, nunca o cliente direto (ADR-003): o RLS
// limita tudo às linhas do próprio usuário.
export function createLibraryRepository(tx: Tx): LibraryRepository {
  return {
    async findEpisode(episodeId) {
      const [row] = await tx
        .select({
          id: episodes.id,
          titleId: seasons.titleId,
          seasonNumber: seasons.seasonNumber,
          episodeNumber: episodes.episodeNumber,
        })
        .from(episodes)
        .innerJoin(seasons, eq(seasons.id, episodes.seasonId))
        .where(eq(episodes.id, episodeId));
      return row ?? null;
    },

    async findTitleMediaType(titleId) {
      const [row] = await tx
        .select({ mediaType: titles.mediaType })
        .from(titles)
        .where(eq(titles.id, titleId));
      if (!row) return null;
      return row.mediaType === "movie" ? "movie" : "tv";
    },

    async getTitleState(userId, titleId) {
      const [row] = await tx
        .select({ status: userTitles.status })
        .from(userTitles)
        .where(
          and(eq(userTitles.userId, userId), eq(userTitles.titleId, titleId)),
        );
      // Do mais recente para o mais antigo: vale o primeiro de cada item.
      const events = await tx
        .select({
          id: watchEvents.id,
          episodeId: watchEvents.episodeId,
          watchedAt: watchEvents.watchedAt,
          precision: watchEvents.watchedAtPrecision,
        })
        .from(watchEvents)
        .where(
          and(eq(watchEvents.userId, userId), eq(watchEvents.titleId, titleId)),
        )
        .orderBy(desc(watchEvents.createdAt), desc(watchEvents.id));
      const latest = new Map<string | null, WatchedItem>();
      for (const e of events) {
        if (latest.has(e.episodeId)) continue;
        latest.set(e.episodeId, {
          episodeId: e.episodeId,
          eventId: e.id,
          watchedAt: e.watchedAt,
          precision: e.precision as WatchedAtPrecision,
        });
      }
      return {
        status: (row?.status as LibraryStatus | undefined) ?? null,
        watched: [...latest.values()],
      };
    },

    async upsertTitleStatus(userId, titleId, status, replaceable) {
      // Só muda o status quando o atual está em `replaceable`; sem mudança,
      // não regrava (nem mexe no updated_at). Mesmo assim o Postgres trava a
      // linha em conflito até o fim da transação.
      await tx
        .insert(userTitles)
        .values({ userId, titleId, status })
        .onConflictDoUpdate({
          target: [userTitles.userId, userTitles.titleId],
          set: { status: sql`excluded.status` },
          setWhere: inArray(userTitles.status, [...replaceable]),
        });
    },

    async listPreviousUnwatched(userId, episode, today) {
      const rows = await tx
        .select({ id: episodes.id })
        .from(episodes)
        .innerJoin(seasons, eq(seasons.id, episodes.seasonId))
        .leftJoin(
          userEpisodeProgress,
          and(
            eq(userEpisodeProgress.episodeId, episodes.id),
            eq(userEpisodeProgress.userId, userId),
          ),
        )
        .where(
          and(
            eq(seasons.titleId, episode.titleId),
            // Especiais (temporada 0) ficam de fora.
            gt(seasons.seasonNumber, 0),
            or(
              lt(seasons.seasonNumber, episode.seasonNumber),
              and(
                eq(seasons.seasonNumber, episode.seasonNumber),
                lt(episodes.episodeNumber, episode.episodeNumber),
              ),
            ),
            // Já lançados. Sem data no catálogo conta como lançado: vem antes
            // de um episódio que o usuário acabou de ver.
            or(isNull(episodes.airDate), lte(episodes.airDate, today)),
            isNull(userEpisodeProgress.episodeId),
          ),
        )
        .orderBy(asc(seasons.seasonNumber), asc(episodes.episodeNumber));
      return rows.map((r) => r.id);
    },

    async insertProgress(userId, titleId, rows) {
      if (rows.length === 0) return [];
      const inserted = await tx
        .insert(userEpisodeProgress)
        // `title_id` é refeito pelo trigger a partir do episódio.
        .values(rows.map((r) => ({ userId, titleId, ...r })))
        .onConflictDoNothing()
        .returning({ episodeId: userEpisodeProgress.episodeId });
      return inserted.map((r) => r.episodeId);
    },

    async insertEvents(userId, events) {
      if (events.length === 0) return;
      await tx.insert(watchEvents).values(
        events.map((e) => ({
          userId,
          titleId: e.titleId,
          episodeId: e.episodeId,
          watchedAt: e.watchedAt,
          watchedAtPrecision: e.precision,
          source: e.source,
        })),
      );
    },

    async hasMovieEvent(userId, titleId) {
      const rows = await tx
        .select({ id: watchEvents.id })
        .from(watchEvents)
        .where(
          and(
            eq(watchEvents.userId, userId),
            eq(watchEvents.titleId, titleId),
            isNull(watchEvents.episodeId),
          ),
        )
        .limit(1);
      return rows.length > 0;
    },

    async deleteEpisodeWatch(userId, episodeId) {
      const progress = await tx
        .delete(userEpisodeProgress)
        .where(
          and(
            eq(userEpisodeProgress.userId, userId),
            eq(userEpisodeProgress.episodeId, episodeId),
          ),
        )
        .returning({ id: userEpisodeProgress.episodeId });
      const events = await tx
        .delete(watchEvents)
        .where(
          and(
            eq(watchEvents.userId, userId),
            eq(watchEvents.episodeId, episodeId),
          ),
        )
        .returning({ id: watchEvents.id });
      return progress.length + events.length;
    },

    async deleteMovieWatch(userId, titleId) {
      const events = await tx
        .delete(watchEvents)
        .where(
          and(
            eq(watchEvents.userId, userId),
            eq(watchEvents.titleId, titleId),
            isNull(watchEvents.episodeId),
          ),
        )
        .returning({ id: watchEvents.id });
      return events.length;
    },

    async updateEventDate(userId, eventId, watchedAt, precision, source) {
      const [row] = await tx
        .update(watchEvents)
        .set({
          watchedAt,
          watchedAtPrecision: precision,
          // Registros importados guardam a origem do import.
          source: sql`case when ${watchEvents.source} in ('live', 'backfill') then ${source} else ${watchEvents.source} end`,
        })
        .where(and(eq(watchEvents.userId, userId), eq(watchEvents.id, eventId)))
        .returning({ episodeId: watchEvents.episodeId });
      return row;
    },

    async refreshProgressDate(userId, episodeId) {
      const latest = tx
        .select({ watchedAt: watchEvents.watchedAt })
        .from(watchEvents)
        .where(
          and(
            eq(watchEvents.userId, userId),
            eq(watchEvents.episodeId, episodeId),
            inArray(watchEvents.watchedAtPrecision, [...PROGRESS_PRECISIONS]),
          ),
        )
        .orderBy(desc(watchEvents.watchedAt))
        .limit(1);
      await tx
        .update(userEpisodeProgress)
        .set({ watchedAt: sql`(${latest})` })
        .where(
          and(
            eq(userEpisodeProgress.userId, userId),
            eq(userEpisodeProgress.episodeId, episodeId),
          ),
        );
    },
  };
}
