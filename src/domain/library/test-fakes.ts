import type { MediaType, TitleStatus } from "../catalog/types";
import type {
  LibraryEpisode,
  LibraryItem,
  LibraryRepository,
  NewWatchEvent,
  WatchedItem,
} from "./ports";
import { type LibraryStatus, PROGRESS_PRECISIONS } from "./values";

// Biblioteca em memória para os testes de domínio (sem banco). Imita o que o
// banco garante: a PK do progresso e a ordem de exibição dos anteriores.

export const NOW = new Date("2026-10-16T15:00:00Z");
export const USER = { id: "11111111-1111-4111-8111-111111111111" };

export type FakeEpisode = LibraryEpisode & { airDate: string | null };
type StoredEvent = NewWatchEvent & { id: string; userId: string };

export function createFakeLibrary(catalog: {
  titles?: Record<string, MediaType>;
  episodes?: FakeEpisode[];
  // Situação de cada série no catálogo (padrão: "unknown").
  titleStatus?: Record<string, TitleStatus>;
}) {
  const titles = catalog.titles ?? {};
  const episodes = catalog.episodes ?? [];
  const statuses = new Map<string, LibraryStatus>();
  const hiddenTitles = new Set<string>();
  const progress = new Map<string, Date | null>();
  const events: StoredEvent[] = [];
  let nextId = 1;

  const key = (userId: string, id: string) => `${userId}:${id}`;

  const repo: LibraryRepository = {
    async findEpisode(id) {
      const e = episodes.find((x) => x.id === id);
      return e
        ? {
            id: e.id,
            titleId: e.titleId,
            seasonNumber: e.seasonNumber,
            episodeNumber: e.episodeNumber,
          }
        : null;
    },
    async findTitleMediaType(titleId) {
      return titles[titleId] ?? null;
    },
    async listLibrary(userId, { statuses: wanted, hidden }, _locale, today) {
      const items: LibraryItem[] = [];
      for (const [k, status] of statuses) {
        const [owner, titleId] = k.split(":");
        if (owner !== userId || (wanted && !wanted.includes(status))) continue;
        if (hiddenTitles.has(k) !== hidden) continue;
        const mediaType = titles[titleId];
        if (!mediaType) continue;
        const released = episodes.filter(
          (e) =>
            e.titleId === titleId &&
            e.seasonNumber > 0 &&
            (e.airDate === null || e.airDate <= today),
        );
        items.push({
          titleId,
          mediaType,
          status,
          title: titleId,
          posterPath: null,
          progress:
            mediaType === "tv"
              ? {
                  released: released.length,
                  watched: released.filter((e) =>
                    progress.has(key(userId, e.id)),
                  ).length,
                }
              : null,
        });
      }
      return items;
    },
    async getTitleState(userId, titleId) {
      const items = new Map<string | null, WatchedItem>();
      // O histórico fica em ordem de gravação: do mais recente ao mais antigo.
      for (const e of [...events].reverse()) {
        if (e.userId !== userId || e.titleId !== titleId) continue;
        const record = {
          eventId: e.id,
          watchedAt: e.watchedAt,
          precision: e.precision,
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
        status: statuses.get(key(userId, titleId)) ?? null,
        hidden: hiddenTitles.has(key(userId, titleId)),
        watched: [...items.values()],
      };
    },
    async upsertTitleStatus(userId, titleId, status, replaceable) {
      const current = statuses.get(key(userId, titleId));
      if (!current || replaceable.includes(current)) {
        statuses.set(key(userId, titleId), status);
      }
    },
    async setTitleStatus(userId, titleId, status) {
      statuses.set(key(userId, titleId), status);
    },
    async setTitleHidden(userId, titleId, hidden) {
      if (!statuses.has(key(userId, titleId))) return false;
      if (hidden) hiddenTitles.add(key(userId, titleId));
      else hiddenTitles.delete(key(userId, titleId));
      return true;
    },
    async removeTitle(userId, titleId) {
      statuses.delete(key(userId, titleId));
      hiddenTitles.delete(key(userId, titleId));
    },
    async listPreviousUnwatched(userId, episode, today) {
      return episodes
        .filter(
          (e) =>
            e.titleId === episode.titleId &&
            e.seasonNumber > 0 &&
            (e.seasonNumber < episode.seasonNumber ||
              (e.seasonNumber === episode.seasonNumber &&
                e.episodeNumber < episode.episodeNumber)) &&
            (e.airDate === null || e.airDate <= today) &&
            !progress.has(key(userId, e.id)),
        )
        .sort(
          (a, b) =>
            a.seasonNumber - b.seasonNumber ||
            a.episodeNumber - b.episodeNumber,
        )
        .map((e) => e.id);
    },
    async listUnwatchedReleased(userId, titleId, today) {
      return episodes
        .filter(
          (e) =>
            e.titleId === titleId &&
            e.seasonNumber > 0 &&
            (e.airDate === null || e.airDate <= today) &&
            !progress.has(key(userId, e.id)),
        )
        .map((e) => ({
          seasonNumber: e.seasonNumber,
          episodeNumber: e.episodeNumber,
        }));
    },
    async insertProgress(userId, _titleId, rows) {
      const inserted: string[] = [];
      for (const r of rows) {
        if (progress.has(key(userId, r.episodeId))) continue;
        progress.set(key(userId, r.episodeId), r.watchedAt);
        inserted.push(r.episodeId);
      }
      return inserted;
    },
    async insertEvents(userId, newEvents) {
      for (const e of newEvents) {
        events.push({
          ...e,
          userId,
          id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`,
        });
      }
    },
    async hasMovieEvent(userId, titleId) {
      return events.some(
        (e) =>
          e.userId === userId && e.titleId === titleId && e.episodeId === null,
      );
    },
    async getSeriesProgress(userId, titleId, today) {
      const released = episodes.filter(
        (e) =>
          e.titleId === titleId &&
          e.seasonNumber > 0 &&
          (e.airDate === null || e.airDate <= today),
      );
      return {
        catalogStatus: catalog.titleStatus?.[titleId] ?? "unknown",
        released: released.length,
        watched: released.filter((e) => progress.has(key(userId, e.id))).length,
      };
    },
    async hasEpisodeProgress(userId, episodeId) {
      return progress.has(key(userId, episodeId));
    },
    async findLatestEventId(userId, target) {
      const match = events.filter(
        (e) =>
          e.userId === userId &&
          ("episodeId" in target
            ? e.episodeId === target.episodeId
            : e.titleId === target.titleId && e.episodeId === null),
      );
      return match.at(-1)?.id;
    },
    async deleteEvent(userId, eventId) {
      const i = events.findIndex(
        (e) => e.userId === userId && e.id === eventId,
      );
      if (i < 0) return undefined;
      const [removed] = events.splice(i, 1);
      return { episodeId: removed.episodeId, titleId: removed.titleId };
    },
    async countEpisodeEvents(userId, episodeId) {
      return events.filter(
        (e) => e.userId === userId && e.episodeId === episodeId,
      ).length;
    },
    async deleteEpisodeProgress(userId, episodeId) {
      progress.delete(key(userId, episodeId));
    },
    async updateEventDate(userId, eventId, watchedAt, precision, source) {
      const e = events.find((x) => x.userId === userId && x.id === eventId);
      if (!e) return undefined;
      e.watchedAt = watchedAt;
      e.precision = precision;
      if (e.source === "live" || e.source === "backfill") e.source = source;
      return { episodeId: e.episodeId };
    },
    async refreshProgressDate(userId, episodeId) {
      if (!progress.has(key(userId, episodeId))) return;
      const dates = events
        .filter(
          (e) =>
            e.userId === userId &&
            e.episodeId === episodeId &&
            PROGRESS_PRECISIONS.includes(e.precision) &&
            e.watchedAt,
        )
        .map((e) => e.watchedAt!.getTime());
      progress.set(
        key(userId, episodeId),
        dates.length ? new Date(Math.max(...dates)) : null,
      );
    },
  };

  return {
    deps: { library: repo, now: () => NOW },
    status: (titleId: string, userId = USER.id) =>
      statuses.get(key(userId, titleId)),
    setStatus: (titleId: string, status: LibraryStatus, userId = USER.id) =>
      statuses.set(key(userId, titleId), status),
    progress: (episodeId: string, userId = USER.id) =>
      progress.get(key(userId, episodeId)),
    watched: (userId = USER.id) =>
      [...progress.keys()]
        .filter((k) => k.startsWith(`${userId}:`))
        .map((k) => k.slice(userId.length + 1)),
    events,
  };
}
