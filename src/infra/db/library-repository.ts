import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import type { TitleStatus } from "@/domain/catalog/types";
import type {
  FollowingItem,
  LibraryItem,
  LibraryRepository,
  WatchedItem,
} from "@/domain/library/ports";
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
  titleTranslations,
  userEpisodeProgress,
  userTitles,
  watchEvents,
} from "./schema";

// Episódios regulares já lançados de cada série e quantos o usuário viu (a
// mesma conta de `getSeriesProgress`, em lote para a lista).
async function seriesProgressByTitle(
  tx: Tx,
  userId: string,
  titleIds: string[],
  today: string,
) {
  const result = new Map<string, { watched: number; released: number }>();
  if (titleIds.length === 0) return result;
  const released = and(
    inArray(seasons.titleId, titleIds),
    gt(seasons.seasonNumber, 0),
    or(isNull(episodes.airDate), lte(episodes.airDate, today)),
  );
  const totals = await tx
    .select({ titleId: seasons.titleId, n: count() })
    .from(episodes)
    .innerJoin(seasons, eq(seasons.id, episodes.seasonId))
    .where(released)
    .groupBy(seasons.titleId);
  const seen = await tx
    .select({ titleId: seasons.titleId, n: count() })
    .from(episodes)
    .innerJoin(seasons, eq(seasons.id, episodes.seasonId))
    .innerJoin(
      userEpisodeProgress,
      and(
        eq(userEpisodeProgress.episodeId, episodes.id),
        eq(userEpisodeProgress.userId, userId),
      ),
    )
    .where(released)
    .groupBy(seasons.titleId);
  for (const t of totals) {
    result.set(t.titleId, { released: t.n, watched: 0 });
  }
  for (const s of seen) {
    const entry = result.get(s.titleId);
    if (entry) entry.watched = s.n;
  }
  return result;
}

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

    async listLibrary(userId, { statuses, hidden }, locale, today, options) {
      if (statuses?.length === 0) return [];
      // Última vez que o usuário marcou algo do título (episódio ou filme).
      const lastWatchedAt = sql`(
        select max(${watchEvents.createdAt}) from ${watchEvents}
        where ${watchEvents.userId} = ${userTitles.userId}
          and ${watchEvents.titleId} = ${userTitles.titleId}
      )`;
      const query = tx
        .select({
          titleId: userTitles.titleId,
          status: userTitles.status,
          mediaType: titles.mediaType,
          originalTitle: titles.originalTitle,
          title: titleTranslations.title,
          posterPath: titleTranslations.posterPath,
        })
        .from(userTitles)
        .innerJoin(titles, eq(titles.id, userTitles.titleId))
        .leftJoin(
          titleTranslations,
          and(
            eq(titleTranslations.titleId, titles.id),
            eq(titleTranslations.locale, locale),
          ),
        )
        .where(
          and(
            eq(userTitles.userId, userId),
            eq(userTitles.hidden, hidden),
            statuses ? inArray(userTitles.status, [...statuses]) : undefined,
            options?.mediaType
              ? eq(titles.mediaType, options.mediaType)
              : undefined,
          ),
        )
        .orderBy(
          sql`${lastWatchedAt} desc nulls last`,
          desc(userTitles.updatedAt),
          desc(userTitles.titleId),
        )
        .$dynamic();
      const rows = await (options?.limit ? query.limit(options.limit) : query);

      const seriesIds = rows
        .filter((r) => r.mediaType === "tv")
        .map((r) => r.titleId);
      const progress = await seriesProgressByTitle(
        tx,
        userId,
        seriesIds,
        today,
      );

      return rows.map((r): LibraryItem => {
        const mediaType = r.mediaType === "movie" ? "movie" : "tv";
        return {
          titleId: r.titleId,
          mediaType,
          status: r.status as LibraryStatus,
          title: r.title ?? r.originalTitle,
          posterPath: r.posterPath,
          progress:
            mediaType === "tv"
              ? (progress.get(r.titleId) ?? { watched: 0, released: 0 })
              : null,
        };
      });
    },

    async listFollowing(userId, locale, today, limit) {
      const rows = (await tx.execute(sql`
        select * from (
          select * from (
            select distinct on (ut.title_id)
              ut.title_id as "titleId",
              'tv' as "mediaType",
              coalesce(tt.title, t.original_title) as "title",
              tt.poster_path as "posterPath",
              e.id as "episodeId",
              s.season_number as "seasonNumber",
              e.episode_number as "episodeNumber",
              e.name as "episodeName",
              greatest(
                ut.updated_at,
                coalesce(
                  (select max(p.created_at) from user_episode_progress p
                    where p.user_id = ut.user_id and p.title_id = ut.title_id),
                  '-infinity'::timestamptz),
                e.air_date::timestamptz) as "sortKey"
            from user_titles ut
            join titles t on t.id = ut.title_id
            left join title_translations tt
              on tt.title_id = t.id and tt.locale = ${locale}
            join seasons s on s.title_id = t.id and s.season_number > 0
            join episodes e on e.season_id = s.id
            left join user_episode_progress up
              on up.episode_id = e.id and up.user_id = ut.user_id
            where ut.user_id = ${userId}
              and ut.status in ('watching', 'watchlist')
              and not ut.hidden
              and t.media_type = 'tv'
              and up.episode_id is null
              and (e.air_date is null or e.air_date <= ${today}::date)
              and (s.season_number, e.episode_number) > coalesce(
                (select (s2.season_number, e2.episode_number)
                   from user_episode_progress p2
                   join episodes e2 on e2.id = p2.episode_id
                   join seasons s2 on s2.id = e2.season_id
                  where p2.user_id = ut.user_id
                    and p2.title_id = ut.title_id
                    and s2.season_number > 0
                  order by s2.season_number desc, e2.episode_number desc
                  limit 1),
                (0, 0))
            order by ut.title_id, s.season_number, e.episode_number
          ) series
          union all
          select
            ut.title_id, 'movie', coalesce(tt.title, t.original_title),
            tt.poster_path, null::uuid, null::int, null::int, null::text,
            ut.updated_at
          from user_titles ut
          join titles t on t.id = ut.title_id
          left join title_translations tt
            on tt.title_id = t.id and tt.locale = ${locale}
          where ut.user_id = ${userId}
            and ut.status = 'watchlist'
            and not ut.hidden
            and t.media_type = 'movie'
        ) queue
        order by "sortKey" desc, "titleId"
        limit ${limit}
      `)) as unknown as {
        titleId: string;
        mediaType: "tv" | "movie";
        title: string;
        posterPath: string | null;
        episodeId: string | null;
        seasonNumber: number | null;
        episodeNumber: number | null;
        episodeName: string | null;
      }[];
      return rows.map(
        (r): FollowingItem => ({
          titleId: r.titleId,
          mediaType: r.mediaType,
          title: r.title,
          posterPath: r.posterPath,
          next:
            r.episodeId && r.seasonNumber !== null && r.episodeNumber !== null
              ? {
                  episodeId: r.episodeId,
                  seasonNumber: r.seasonNumber,
                  episodeNumber: r.episodeNumber,
                  episodeName: r.episodeName,
                }
              : null,
        }),
      );
    },

    async getTitleState(userId, titleId) {
      const [row] = await tx
        .select({ status: userTitles.status, hidden: userTitles.hidden })
        .from(userTitles)
        .where(
          and(eq(userTitles.userId, userId), eq(userTitles.titleId, titleId)),
        );
      // Do mais recente para o mais antigo: o primeiro de cada item é o atual.
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
      const items = new Map<string | null, WatchedItem>();
      for (const e of events) {
        const record = {
          eventId: e.id,
          watchedAt: e.watchedAt,
          precision: e.precision as WatchedAtPrecision,
        };
        const item = items.get(e.episodeId);
        if (item) item.records.push(record);
        else
          items.set(e.episodeId, {
            ...record,
            episodeId: e.episodeId,
            records: [record],
          });
      }
      return {
        status: (row?.status as LibraryStatus | undefined) ?? null,
        hidden: row?.hidden ?? false,
        watched: [...items.values()],
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

    async setTitleStatus(userId, titleId, status) {
      await tx
        .insert(userTitles)
        .values({ userId, titleId, status })
        .onConflictDoUpdate({
          target: [userTitles.userId, userTitles.titleId],
          set: { status },
          // Sem mudança, não regrava (nem mexe no updated_at).
          setWhere: sql`${userTitles.status} <> ${status}`,
        });
    },

    async setTitleHidden(userId, titleId, hidden) {
      const rows = await tx
        .update(userTitles)
        .set({ hidden })
        // Só grava se mudou (nem mexe no updated_at).
        .where(
          and(
            eq(userTitles.userId, userId),
            eq(userTitles.titleId, titleId),
            ne(userTitles.hidden, hidden),
          ),
        )
        .returning({ titleId: userTitles.titleId });
      if (rows.length > 0) return true;
      const [exists] = await tx
        .select({ titleId: userTitles.titleId })
        .from(userTitles)
        .where(
          and(eq(userTitles.userId, userId), eq(userTitles.titleId, titleId)),
        );
      return Boolean(exists);
    },

    async removeTitle(userId, titleId) {
      await tx
        .delete(userTitles)
        .where(
          and(eq(userTitles.userId, userId), eq(userTitles.titleId, titleId)),
        );
    },

    async listUnwatchedReleased(userId, titleId, today) {
      return tx
        .select({
          seasonNumber: seasons.seasonNumber,
          episodeNumber: episodes.episodeNumber,
        })
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
            eq(seasons.titleId, titleId),
            gt(seasons.seasonNumber, 0),
            or(isNull(episodes.airDate), lte(episodes.airDate, today)),
            isNull(userEpisodeProgress.episodeId),
          ),
        );
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
          // `now()` é o início da transação; o relógio real mantém a ordem
          // dos registros gravados na mesma.
          createdAt: sql`clock_timestamp()`,
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

    async getSeriesProgress(userId, titleId, today) {
      const [title] = await tx
        .select({ status: titles.status })
        .from(titles)
        .where(eq(titles.id, titleId));
      const released = and(
        eq(seasons.titleId, titleId),
        gt(seasons.seasonNumber, 0),
        or(isNull(episodes.airDate), lte(episodes.airDate, today)),
      );
      const [total] = await tx
        .select({ n: count() })
        .from(episodes)
        .innerJoin(seasons, eq(seasons.id, episodes.seasonId))
        .where(released);
      const [seen] = await tx
        .select({ n: count() })
        .from(episodes)
        .innerJoin(seasons, eq(seasons.id, episodes.seasonId))
        .innerJoin(
          userEpisodeProgress,
          and(
            eq(userEpisodeProgress.episodeId, episodes.id),
            eq(userEpisodeProgress.userId, userId),
          ),
        )
        .where(released);
      return {
        catalogStatus: (title?.status ?? "unknown") as TitleStatus,
        released: total?.n ?? 0,
        watched: seen?.n ?? 0,
      };
    },

    async hasEpisodeProgress(userId, episodeId) {
      const rows = await tx
        .select({ id: userEpisodeProgress.episodeId })
        .from(userEpisodeProgress)
        .where(
          and(
            eq(userEpisodeProgress.userId, userId),
            eq(userEpisodeProgress.episodeId, episodeId),
          ),
        )
        .limit(1);
      return rows.length > 0;
    },

    async findLatestEventId(userId, target) {
      const [row] = await tx
        .select({ id: watchEvents.id })
        .from(watchEvents)
        .where(
          and(
            eq(watchEvents.userId, userId),
            "episodeId" in target
              ? eq(watchEvents.episodeId, target.episodeId)
              : and(
                  eq(watchEvents.titleId, target.titleId),
                  isNull(watchEvents.episodeId),
                ),
          ),
        )
        .orderBy(desc(watchEvents.createdAt), desc(watchEvents.id))
        .limit(1);
      return row?.id;
    },

    async deleteEvent(userId, eventId) {
      const [row] = await tx
        .delete(watchEvents)
        .where(and(eq(watchEvents.userId, userId), eq(watchEvents.id, eventId)))
        .returning({
          episodeId: watchEvents.episodeId,
          titleId: watchEvents.titleId,
        });
      return row;
    },

    async countEpisodeEvents(userId, episodeId) {
      const [row] = await tx
        .select({ n: count() })
        .from(watchEvents)
        .where(
          and(
            eq(watchEvents.userId, userId),
            eq(watchEvents.episodeId, episodeId),
          ),
        );
      return row?.n ?? 0;
    },

    async deleteEpisodeProgress(userId, episodeId) {
      await tx
        .delete(userEpisodeProgress)
        .where(
          and(
            eq(userEpisodeProgress.userId, userId),
            eq(userEpisodeProgress.episodeId, episodeId),
          ),
        );
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
