import type { MediaType } from "../catalog/types";
import type { LibraryEpisode, LibraryRepository, NewWatchEvent } from "./ports";
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
}) {
  const titles = catalog.titles ?? {};
  const episodes = catalog.episodes ?? [];
  const statuses = new Map<string, LibraryStatus>();
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
    async getTitleState(userId, titleId) {
      const latest = new Map<string | null, StoredEvent>();
      // O histórico fica em ordem de gravação: o último de cada item vale.
      for (const e of events) {
        if (e.userId === userId && e.titleId === titleId) {
          latest.set(e.episodeId, e);
        }
      }
      return {
        status: statuses.get(key(userId, titleId)) ?? null,
        watched: [...latest.values()].map((e) => ({
          episodeId: e.episodeId,
          eventId: e.id,
          watchedAt: e.watchedAt,
          precision: e.precision,
        })),
      };
    },
    async upsertTitleStatus(userId, titleId, status, replaceable) {
      const current = statuses.get(key(userId, titleId));
      if (!current || replaceable.includes(current)) {
        statuses.set(key(userId, titleId), status);
      }
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
        events.push({ ...e, userId, id: `event-${nextId++}` });
      }
    },
    async hasMovieEvent(userId, titleId) {
      return events.some(
        (e) =>
          e.userId === userId && e.titleId === titleId && e.episodeId === null,
      );
    },
    async deleteEpisodeWatch(userId, episodeId) {
      const had = progress.delete(key(userId, episodeId)) ? 1 : 0;
      const before = events.length;
      removeEvents((e) => e.userId === userId && e.episodeId === episodeId);
      return had + before - events.length;
    },
    async deleteMovieWatch(userId, titleId) {
      const before = events.length;
      removeEvents(
        (e) =>
          e.userId === userId && e.titleId === titleId && e.episodeId === null,
      );
      return before - events.length;
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

  function removeEvents(match: (e: StoredEvent) => boolean) {
    for (let i = events.length - 1; i >= 0; i--) {
      if (match(events[i])) events.splice(i, 1);
    }
  }

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
