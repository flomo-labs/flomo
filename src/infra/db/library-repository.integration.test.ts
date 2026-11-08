import { and, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { addTitleToLibraryByRef } from "@/domain/library/add-title-by-ref";
import type { CatalogProvider } from "@/domain/catalog/ports";
import type { CatalogRef } from "@/domain/catalog/types";
import { providerTitle } from "@/domain/catalog/test-fakes";
import { listFollowing } from "@/domain/library/following";
import {
  getTitleLibraryState,
  listUnwatchedEpisodes,
} from "@/domain/library/get-title-state";
import { listLibrary } from "@/domain/library/list-library";
import {
  deleteWatchRecord,
  markEpisodeWatched,
  markMovieWatched,
  markSeasonWatched,
  unmarkEpisodesWatched,
  rewatchEpisode,
  rewatchMovie,
  setWatchDate,
  unmarkEpisodeWatched,
} from "@/domain/library/mark-watched";
import {
  removeTitleFromLibrary,
  setTitleHidden,
  setTitleStatus,
} from "@/domain/library/set-status";
import { createCatalogStore } from "./catalog-repository";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { createLibraryRepository } from "./library-repository";
import {
  episodes,
  seasons,
  titles,
  titleTranslations,
  userEpisodeProgress,
  userTitles,
  watchEvents,
} from "./schema";

// Casos de uso da biblioteca contra o banco de teste, pelo mesmo caminho da
// borda: repositório dentro do `withUser`, sob RLS.
afterAll(closeTestDb);

const NOW = new Date("2026-10-16T15:00:00Z");

// Série com especial, duas temporadas (a última com um episódio futuro) e um
// filme.
async function createCatalog(tx: Tx) {
  const [series] = await tx
    .insert(titles)
    .values({ mediaType: "tv", originalTitle: "Série" })
    .returning({ id: titles.id });
  const [movie] = await tx
    .insert(titles)
    .values({ mediaType: "movie", originalTitle: "Filme" })
    .returning({ id: titles.id });
  const ids: Record<string, string> = {};
  for (const [season, count] of [
    [0, 1],
    [1, 2],
    [2, 3],
  ]) {
    const [s] = await tx
      .insert(seasons)
      .values({ titleId: series.id, seasonNumber: season })
      .returning({ id: seasons.id });
    for (let n = 1; n <= count; n++) {
      const airDate = season === 2 && n === 3 ? "2026-12-01" : "2020-01-01";
      const [e] = await tx
        .insert(episodes)
        .values({ seasonId: s.id, episodeNumber: n, airDate })
        .returning({ id: episodes.id });
      ids[`S${season}E${n}`] = e.id;
    }
  }
  return { seriesId: series.id, movieId: movie.id, ep: ids };
}

function run<T>(
  tx: Tx,
  userId: string,
  fn: (
    deps: {
      library: ReturnType<typeof createLibraryRepository>;
      now: () => Date;
    },
    user: { id: string },
  ) => Promise<T>,
) {
  return asUser(tx, userId, (utx) =>
    fn(
      { library: createLibraryRepository(utx), now: () => NOW },
      { id: userId },
    ),
  );
}

describe("marcar como assistido no banco", () => {
  it("marca o episódio, os anteriores sem data e põe a série em Assistindo", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);
      await tx
        .insert(userTitles)
        .values({ userId: user, titleId: c.seriesId, status: "paused" });

      // Sem especiais e sem o episódio ainda não lançado (S2E3).
      const pending = await run(tx, user, (deps, u) =>
        listUnwatchedEpisodes(deps, u, { titleId: c.seriesId }),
      );
      expect(pending.ok && pending.value).toHaveLength(4);

      const result = await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, {
          episodeId: c.ep.S2E2,
          includePrevious: true,
        }),
      );
      expect(result).toEqual({
        ok: true,
        value: { marked: true, previousMarked: 3 },
      });
      expect(
        await run(tx, user, (deps, u) =>
          listUnwatchedEpisodes(deps, u, { titleId: c.seriesId }),
        ),
      ).toEqual({ ok: true, value: [] });

      const [status] = await tx
        .select({ status: userTitles.status })
        .from(userTitles)
        .where(eq(userTitles.userId, user));
      expect(status.status).toBe("watching");

      const events = await tx
        .select()
        .from(watchEvents)
        .where(eq(watchEvents.userId, user));
      const byEpisode = new Map(events.map((e) => [e.episodeId, e]));
      expect(byEpisode.get(c.ep.S2E2)).toMatchObject({
        watchedAt: NOW,
        watchedAtPrecision: "exact",
        source: "live",
        titleId: c.seriesId,
      });
      for (const id of [c.ep.S1E1, c.ep.S1E2, c.ep.S2E1]) {
        expect(byEpisode.get(id)).toMatchObject({
          watchedAt: null,
          watchedAtPrecision: "unknown",
          source: "backfill",
        });
      }
      // Especial e episódio futuro ficam de fora.
      expect(byEpisode.has(c.ep.S0E1)).toBe(false);
      expect(events).toHaveLength(4);

      const again = await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, {
          episodeId: c.ep.S2E2,
          includePrevious: true,
        }),
      );
      expect(again).toEqual({
        ok: true,
        value: { marked: false, previousMarked: 0 },
      });
    }));

  it("filme: grava uma vez e põe em Assistido", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);

      for (const marked of [true, false]) {
        expect(
          await run(tx, user, (deps, u) =>
            markMovieWatched(deps, u, { titleId: c.movieId }),
          ),
        ).toEqual({ ok: true, value: { marked } });
      }
      const [row] = await tx
        .select({ status: userTitles.status })
        .from(userTitles)
        .where(
          and(eq(userTitles.userId, user), eq(userTitles.titleId, c.movieId)),
        );
      expect(row.status).toBe("watched");

      // Marcar de novo não regrava o título (updated_at fica igual).
      const old = new Date("2020-01-01T00:00:00Z");
      // Sem o trigger, para conseguir gravar uma data antiga.
      await tx.execute(
        sql`alter table user_titles disable trigger user_titles_set_updated_at`,
      );
      await tx
        .update(userTitles)
        .set({ updatedAt: old })
        .where(eq(userTitles.userId, user));
      await tx.execute(
        sql`alter table user_titles enable trigger user_titles_set_updated_at`,
      );
      await run(tx, user, (deps, u) =>
        markMovieWatched(deps, u, { titleId: c.movieId }),
      );
      const [after] = await tx
        .select({ updatedAt: userTitles.updatedAt })
        .from(userTitles)
        .where(eq(userTitles.userId, user));
      expect(after.updatedAt).toEqual(old);
    }));

  it("lê o estado do título: só os próprios registros, o mais recente de cada item", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const other = await createUser(tx);
      const c = await createCatalog(tx);
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, { episodeId: c.ep.S1E1 }),
      );
      await run(tx, other, (deps, u) =>
        markEpisodeWatched(deps, u, { episodeId: c.ep.S1E2 }),
      );

      const state = await run(tx, user, (deps, u) =>
        getTitleLibraryState(deps, u, { titleId: c.seriesId }),
      );
      expect(state).toMatchObject({
        ok: true,
        value: {
          status: "watching",
          watched: [
            { episodeId: c.ep.S1E1, watchedAt: NOW, precision: "exact" },
          ],
        },
      });

      const empty = await run(tx, user, (deps, u) =>
        getTitleLibraryState(deps, u, { titleId: c.movieId }),
      );
      expect(empty).toEqual({
        ok: true,
        value: { status: null, hidden: false, watched: [] },
      });
    }));

  it("registrar de novo: só item já visto, com um registro a mais e um só progresso", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);

      expect(
        await run(tx, user, (deps, u) =>
          rewatchEpisode(deps, u, { episodeId: c.ep.S1E1 }),
        ),
      ).toMatchObject({ ok: false, error: { code: "NOT_WATCHED" } });
      expect(
        await run(tx, user, (deps, u) =>
          rewatchMovie(deps, u, { titleId: c.movieId }),
        ),
      ).toMatchObject({ ok: false, error: { code: "NOT_WATCHED" } });

      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, { episodeId: c.ep.S1E1 }),
      );
      expect(
        await run(tx, user, (deps, u) =>
          rewatchEpisode(deps, u, { episodeId: c.ep.S1E1 }),
        ),
      ).toEqual({ ok: true, value: { recorded: true } });

      await run(tx, user, (deps, u) =>
        markMovieWatched(deps, u, { titleId: c.movieId }),
      );
      await run(tx, user, (deps, u) =>
        rewatchMovie(deps, u, { titleId: c.movieId }),
      );

      const events = await tx
        .select({ episodeId: watchEvents.episodeId })
        .from(watchEvents)
        .where(eq(watchEvents.userId, user));
      expect(events.filter((e) => e.episodeId === c.ep.S1E1)).toHaveLength(2);
      expect(events.filter((e) => e.episodeId === null)).toHaveLength(2);
      const progress = await tx
        .select()
        .from(userEpisodeProgress)
        .where(eq(userEpisodeProgress.userId, user));
      expect(progress).toHaveLength(1);
    }));

  it("desmarcar tira só o último registro; apagar registro escolhido respeita o dono", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const other = await createUser(tx);
      const c = await createCatalog(tx);
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, {
          episodeId: c.ep.S1E1,
          when: { kind: "date", precision: "day", value: "2026-10-01" },
        }),
      );
      await run(tx, user, (deps, u) =>
        rewatchEpisode(deps, u, { episodeId: c.ep.S1E1 }),
      );

      await run(tx, user, (deps, u) =>
        unmarkEpisodeWatched(deps, u, { episodeId: c.ep.S1E1 }),
      );
      const left = await tx
        .select()
        .from(watchEvents)
        .where(eq(watchEvents.userId, user));
      // Ficou o mais antigo (do dia 1º), e o episódio segue visto.
      expect(left).toHaveLength(1);
      expect(left[0].watchedAtPrecision).toBe("day");
      const [progress] = await tx
        .select()
        .from(userEpisodeProgress)
        .where(eq(userEpisodeProgress.userId, user));
      expect(progress.watchedAt).toEqual(new Date("2026-10-01T12:00:00Z"));

      // Outro usuário não apaga o registro dele.
      expect(
        await run(tx, other, (deps, u) =>
          deleteWatchRecord(deps, u, { eventId: left[0].id }),
        ),
      ).toMatchObject({ ok: false, error: { code: "EVENT_NOT_FOUND" } });
      // O dono apaga o último: o episódio deixa de estar visto.
      await run(tx, user, (deps, u) =>
        deleteWatchRecord(deps, u, { eventId: left[0].id }),
      );
      expect(
        await tx
          .select()
          .from(userEpisodeProgress)
          .where(eq(userEpisodeProgress.userId, user)),
      ).toHaveLength(0);
    }));

  it("série encerrada com tudo lançado visto vira Assistido; desmarcar devolve a Assistindo", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);
      await tx
        .update(titles)
        .set({ status: "ended" })
        .where(eq(titles.id, c.seriesId));
      const status = async () =>
        (
          await tx
            .select({ status: userTitles.status })
            .from(userTitles)
            .where(eq(userTitles.userId, user))
        )[0]?.status;

      // S2E3 ainda não foi lançado: não é preciso vê-lo.
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, {
          episodeId: c.ep.S2E2,
          includePrevious: true,
        }),
      );
      expect(await status()).toBe("watched");

      await run(tx, user, (deps, u) =>
        unmarkEpisodeWatched(deps, u, { episodeId: c.ep.S1E1 }),
      );
      expect(await status()).toBe("watching");

      // Em exibição: nunca vira Assistido sozinha.
      await tx
        .update(titles)
        .set({ status: "returning" })
        .where(eq(titles.id, c.seriesId));
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, { episodeId: c.ep.S1E1 }),
      );
      expect(await status()).toBe("watching");
    }));

  it("adiciona à biblioteca, muda a situação e remove sem perder o histórico", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);
      const status = async () =>
        (
          await tx
            .select({ status: userTitles.status })
            .from(userTitles)
            .where(eq(userTitles.userId, user))
        )[0]?.status;

      const added = await run(tx, user, (deps, u) =>
        setTitleStatus(deps, u, { titleId: c.seriesId, status: "watchlist" }),
      );
      expect(added.ok).toBe(true);
      expect(await status()).toBe("watchlist");

      await run(tx, user, (deps, u) =>
        setTitleStatus(deps, u, { titleId: c.seriesId, status: "paused" }),
      );
      expect(await status()).toBe("paused");

      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, { episodeId: c.ep.S1E1 }),
      );
      await run(tx, user, (deps, u) =>
        removeTitleFromLibrary(deps, u, { titleId: c.seriesId }),
      );
      expect(await status()).toBeUndefined();
      expect(
        await tx
          .select()
          .from(userEpisodeProgress)
          .where(eq(userEpisodeProgress.userId, user)),
      ).toHaveLength(1);

      // Ocultar não muda a situação; só tira o título da lista.
      await run(tx, user, (deps, u) =>
        setTitleStatus(deps, u, { titleId: c.seriesId, status: "paused" }),
      );
      const hide = await run(tx, user, (deps, u) =>
        setTitleHidden(deps, u, { titleId: c.seriesId, hidden: true }),
      );
      expect(hide.ok).toBe(true);
      expect(await status()).toBe("paused");
      const visible = await run(tx, user, (deps, u) =>
        listLibrary(deps, u, {}),
      );
      expect(visible.ok && visible.value).toHaveLength(0);
      const hidden = await run(tx, user, (deps, u) =>
        listLibrary(deps, u, { filter: "hidden" }),
      );
      expect(hidden.ok && hidden.value.map((i) => i.titleId)).toEqual([
        c.seriesId,
      ]);
      const state = await run(tx, user, (deps, u) =>
        getTitleLibraryState(deps, u, { titleId: c.seriesId }),
      );
      expect(state.ok && state.value.hidden).toBe(true);
      // Marcar um episódio traz o título de volta à lista.
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, { episodeId: c.ep.S1E2 }),
      );
      const back = await run(tx, user, (deps, u) => listLibrary(deps, u, {}));
      expect(back.ok && back.value).toHaveLength(1);

      // Marcar de novo traz o título de volta, com o que já estava marcado.
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, { episodeId: c.ep.S1E2 }),
      );
      expect(await status()).toBe("watching");

      const missing = await run(tx, user, (deps, u) =>
        setTitleStatus(deps, u, {
          titleId: "00000000-0000-4000-8000-000000000000",
          status: "watchlist",
        }),
      );
      expect(missing).toMatchObject({
        ok: false,
        error: { code: "TITLE_NOT_FOUND" },
      });
    }));

  it("lista a biblioteca com filtro e progresso da série", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const other = await createUser(tx);
      const c = await createCatalog(tx);
      await tx.insert(titleTranslations).values({
        titleId: c.seriesId,
        locale: "pt-BR",
        title: "Série em português",
        posterPath: "/poster.jpg",
      });
      await tx
        .insert(userTitles)
        .values({ userId: user, titleId: c.movieId, status: "paused" });
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, {
          episodeId: c.ep.S1E2,
          includePrevious: true,
        }),
      );
      // A biblioteca de outro usuário não aparece.
      await tx
        .insert(userTitles)
        .values({ userId: other, titleId: c.movieId, status: "watching" });

      const all = await run(tx, user, (deps, u) => listLibrary(deps, u, {}));
      expect(all).toMatchObject({ ok: true });
      const items = all.ok ? all.value : [];
      expect(items.map((i) => i.titleId).sort()).toEqual(
        [c.seriesId, c.movieId].sort(),
      );
      // Especial e episódio futuro não entram nos 4 episódios lançados.
      expect(items.find((i) => i.titleId === c.seriesId)).toMatchObject({
        title: "Série em português",
        posterPath: "/poster.jpg",
        status: "watching",
        progress: { watched: 2, released: 4 },
      });
      expect(items.find((i) => i.titleId === c.movieId)).toMatchObject({
        title: "Filme",
        progress: null,
      });

      const paused = await run(tx, user, (deps, u) =>
        listLibrary(deps, u, { filter: "paused" }),
      );
      expect(paused.ok && paused.value.map((i) => i.titleId)).toEqual([
        c.movieId,
      ]);
    }));

  it("biblioteca: quem foi marcado como visto por último vem primeiro", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);
      const order = async () => {
        const r = await run(tx, user, (deps, u) => listLibrary(deps, u, {}));
        return r.ok ? r.value.map((i) => i.titleId) : null;
      };
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, { episodeId: c.ep.S1E1 }),
      );
      await run(tx, user, (deps, u) =>
        markMovieWatched(deps, u, { titleId: c.movieId }),
      );

      // Dentro de uma transação `now()` não muda: as datas vão à mão, e o
      // trigger de `updated_at` fica desligado.
      await tx.execute(sql`set local session_replication_role = replica`);
      const at = (iso: string) => new Date(iso);
      await tx
        .update(userTitles)
        .set({ updatedAt: at("2026-01-01") })
        .where(eq(userTitles.titleId, c.movieId));
      await tx
        .update(userTitles)
        .set({ updatedAt: at("2026-01-02") })
        .where(eq(userTitles.titleId, c.seriesId));
      await tx
        .update(watchEvents)
        .set({ createdAt: at("2026-02-01") })
        .where(eq(watchEvents.titleId, c.movieId));
      await tx
        .update(watchEvents)
        .set({ createdAt: at("2026-02-02") })
        .where(eq(watchEvents.titleId, c.seriesId));
      expect(await order()).toEqual([c.seriesId, c.movieId]);

      // Assistir o filme de novo o leva ao topo, sem mudar a situação.
      await tx
        .update(watchEvents)
        .set({ createdAt: at("2026-02-03") })
        .where(eq(watchEvents.titleId, c.movieId));
      expect(await order()).toEqual([c.movieId, c.seriesId]);
    }));

  it("seguintes: série e filme na fila, o que mexeu por último no topo", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);
      const queue = async () => {
        const r = await run(tx, user, (deps, u) => listFollowing(deps, u));
        return r.ok ? r.value.map((i) => i.next?.episodeId ?? i.titleId) : null;
      };

      // Marcar só o S2E1 (sem anteriores): o seguinte é o S2E2, não o S1E1.
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, { episodeId: c.ep.S2E1 }),
      );
      expect(await queue()).toEqual([c.ep.S2E2]);

      // Dentro de uma transação `now()` não muda: as datas vão à mão.
      // O trigger de `updated_at` também refaria a data: fica desligado.
      await tx.execute(sql`set local session_replication_role = replica`);
      const at = (iso: string) => new Date(iso);
      await tx
        .update(userTitles)
        .set({ updatedAt: at("2026-01-01") })
        .where(eq(userTitles.titleId, c.seriesId));
      await tx
        .update(userEpisodeProgress)
        .set({ createdAt: at("2026-01-02") })
        .where(eq(userEpisodeProgress.userId, user));

      // Filme adicionado depois sobe ao topo.
      await run(tx, user, (deps, u) =>
        setTitleStatus(deps, u, { titleId: c.movieId, status: "watchlist" }),
      );
      await tx
        .update(userTitles)
        .set({ updatedAt: at("2026-01-03") })
        .where(eq(userTitles.titleId, c.movieId));
      expect(await queue()).toEqual([c.movieId, c.ep.S2E2]);

      // Marcar um episódio da série a leva de volta ao topo.
      await tx
        .update(userEpisodeProgress)
        .set({ createdAt: at("2026-01-04") })
        .where(eq(userEpisodeProgress.userId, user));
      expect(await queue()).toEqual([c.ep.S2E2, c.movieId]);

      // Tudo lançado visto: série em dia (S2E3 ainda não saiu).
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, {
          episodeId: c.ep.S2E2,
          includePrevious: true,
        }),
      );
      expect(await queue()).toEqual([c.movieId]);

      // Filme assistido sai; título oculto não entra.
      await run(tx, user, (deps, u) =>
        markMovieWatched(deps, u, { titleId: c.movieId }),
      );
      expect(await queue()).toEqual([]);
    }));

  it("seguintes: começa no S1E1, especial não conta e episódio sem data conta como lançado", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);
      const next = async () => {
        const r = await run(tx, user, (deps, u) => listFollowing(deps, u));
        return r.ok ? r.value.map((i) => i.next?.episodeId ?? null) : null;
      };
      await run(tx, user, (deps, u) =>
        setTitleStatus(deps, u, { titleId: c.seriesId, status: "watchlist" }),
      );

      // Nada visto: o primeiro episódio regular, não o especial (S0E1).
      expect(await next()).toEqual([c.ep.S1E1]);

      // Ver o especial não conta como progresso.
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, { episodeId: c.ep.S0E1 }),
      );
      expect(await next()).toEqual([c.ep.S1E1]);

      // Episódio sem data no catálogo conta como lançado.
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, {
          episodeId: c.ep.S2E2,
          includePrevious: true,
        }),
      );
      expect(await next()).toEqual([]);
      await tx
        .update(episodes)
        .set({ airDate: null })
        .where(eq(episodes.id, c.ep.S2E3));
      expect(await next()).toEqual([c.ep.S2E3]);
    }));

  it("desmarcar apaga progresso e histórico do episódio", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, { episodeId: c.ep.S1E1 }),
      );
      expect(
        await run(tx, user, (deps, u) =>
          unmarkEpisodeWatched(deps, u, { episodeId: c.ep.S1E1 }),
        ),
      ).toEqual({ ok: true, value: { removed: true } });

      const progress = await tx
        .select()
        .from(userEpisodeProgress)
        .where(eq(userEpisodeProgress.userId, user));
      const events = await tx
        .select()
        .from(watchEvents)
        .where(eq(watchEvents.userId, user));
      expect([progress.length, events.length]).toEqual([0, 0]);
    }));

  it("trocar a data atualiza o progresso; outro usuário não acha o registro", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const other = await createUser(tx);
      const c = await createCatalog(tx);
      await run(tx, user, (deps, u) =>
        markEpisodeWatched(deps, u, { episodeId: c.ep.S1E1 }),
      );
      const [event] = await tx
        .select({ id: watchEvents.id })
        .from(watchEvents)
        .where(eq(watchEvents.userId, user));

      expect(
        await run(tx, other, (deps, u) =>
          setWatchDate(deps, u, {
            eventId: event.id,
            when: { kind: "unknown" },
          }),
        ),
      ).toMatchObject({ ok: false, error: { code: "EVENT_NOT_FOUND" } });

      expect(
        await run(tx, user, (deps, u) =>
          setWatchDate(deps, u, {
            eventId: event.id,
            when: { kind: "date", precision: "day", value: "2025-03-10" },
          }),
        ),
      ).toEqual({ ok: true, value: { eventId: event.id } });

      const [progress] = await tx
        .select({ watchedAt: userEpisodeProgress.watchedAt })
        .from(userEpisodeProgress)
        .where(eq(userEpisodeProgress.userId, user));
      expect(progress.watchedAt).toEqual(new Date("2025-03-10T12:00:00Z"));

      await run(tx, user, (deps, u) =>
        setWatchDate(deps, u, { eventId: event.id, when: { kind: "unknown" } }),
      );
      const [cleared] = await tx
        .select({ watchedAt: userEpisodeProgress.watchedAt })
        .from(userEpisodeProgress)
        .where(eq(userEpisodeProgress.userId, user));
      expect(cleared.watchedAt).toBeNull();
    }));

  it("temporada inteira: data de exibição de cada episódio, idempotente, só a biblioteca do próprio usuário, desfazer", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const other = await createUser(tx);
      const c = await createCatalog(tx);
      await tx
        .update(episodes)
        .set({ airDate: "2024-02-01" })
        .where(eq(episodes.id, c.ep.S2E1));
      await tx
        .update(episodes)
        .set({ airDate: null })
        .where(eq(episodes.id, c.ep.S2E2));

      const marked = await run(tx, user, (deps, u) =>
        markSeasonWatched(deps, u, {
          titleId: c.seriesId,
          seasonNumber: 2,
          when: { kind: "airDate" },
        }),
      );
      // O S2E3 ainda não foi lançado e fica de fora.
      expect(marked).toEqual({
        ok: true,
        value: {
          marked: 2,
          alreadyMarked: 0,
          markedEpisodeIds: [c.ep.S2E1, c.ep.S2E2],
        },
      });
      const events = await tx
        .select()
        .from(watchEvents)
        .where(eq(watchEvents.userId, user));
      const byEpisode = new Map(events.map((e) => [e.episodeId, e]));
      expect(byEpisode.get(c.ep.S2E1)).toMatchObject({
        watchedAt: new Date("2024-02-01T12:00:00Z"),
        watchedAtPrecision: "day",
        source: "backfill",
      });
      expect(byEpisode.get(c.ep.S2E2)).toMatchObject({
        watchedAt: null,
        watchedAtPrecision: "unknown",
      });
      expect(events).toHaveLength(2);

      // Outro usuário não ganha nada, e marcar de novo não duplica.
      expect(
        await tx
          .select()
          .from(watchEvents)
          .where(eq(watchEvents.userId, other)),
      ).toHaveLength(0);
      expect(
        await run(tx, user, (deps, u) =>
          markSeasonWatched(deps, u, {
            titleId: c.seriesId,
            seasonNumber: 2,
            when: { kind: "now" },
          }),
        ),
      ).toEqual({
        ok: true,
        value: { marked: 0, alreadyMarked: 2, markedEpisodeIds: [] },
      });
      expect(
        await tx.select().from(watchEvents).where(eq(watchEvents.userId, user)),
      ).toHaveLength(2);

      expect(
        await run(tx, user, (deps, u) =>
          unmarkEpisodesWatched(deps, u, {
            episodeIds: [c.ep.S2E1, c.ep.S2E2],
          }),
        ),
      ).toEqual({ ok: true, value: { removed: 2 } });
      expect(
        await tx
          .select()
          .from(userEpisodeProgress)
          .where(eq(userEpisodeProgress.userId, user)),
      ).toHaveLength(0);
    }));

  it("filme: marcar no dia do lançamento usa a data do catálogo", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const c = await createCatalog(tx);
      await tx
        .update(titles)
        .set({ releaseDate: "2019-07-01" })
        .where(eq(titles.id, c.movieId));
      await run(tx, user, (deps, u) =>
        markMovieWatched(deps, u, {
          titleId: c.movieId,
          when: { kind: "airDate" },
        }),
      );
      const [event] = await tx
        .select()
        .from(watchEvents)
        .where(eq(watchEvents.userId, user));
      expect(event).toMatchObject({
        watchedAt: new Date("2019-07-01T12:00:00Z"),
        watchedAtPrecision: "day",
        source: "backfill",
      });
    }));
});

describe("adicionar à biblioteca um título fora do catálogo", () => {
  const ref = { mediaType: "tv", externalId: "987654" };

  function setupAdd(tx: Tx, userId: string) {
    const calls: unknown[] = [];
    const provider = {
      fetchTitle: async () => {
        calls.push(1);
        return providerTitle({
          ref: { mediaType: "tv", externalId: "987654" },
        });
      },
    } as unknown as CatalogProvider;
    return {
      calls,
      deps: {
        catalog: {
          provider,
          store: createCatalogStore(tx, "teste"),
          now: () => NOW,
          background: () => undefined,
        },
        inLibrary: <T>(
          fn: (deps: {
            library: ReturnType<typeof createLibraryRepository>;
            now: () => Date;
          }) => Promise<T>,
        ) =>
          asUser(tx, userId, (utx) =>
            fn({ library: createLibraryRepository(utx), now: () => NOW }),
          ),
        allowProviderFetch: () => true,
      },
    };
  }

  it("grava o título e põe em Quero ver numa operação só, sob RLS", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const { deps, calls } = setupAdd(tx, user);

      const first = await addTitleToLibraryByRef(deps, { id: user }, ref);
      expect(first).toMatchObject({ ok: true, value: { added: true } });
      const second = await addTitleToLibraryByRef(deps, { id: user }, ref);
      expect(second).toMatchObject({ ok: true, value: { added: false } });
      expect(calls).toHaveLength(1);

      const rows = await tx
        .select({ status: userTitles.status })
        .from(userTitles)
        .where(eq(userTitles.userId, user));
      expect(rows).toEqual([{ status: "watchlist" }]);
    }));

  it("duas pessoas com o mesmo título novo ficam com um só título no catálogo", () =>
    inRollback(async (tx) => {
      const a = await createUser(tx);
      const b = await createUser(tx);
      const first = await addTitleToLibraryByRef(
        setupAdd(tx, a).deps,
        { id: a },
        ref,
      );
      const second = await addTitleToLibraryByRef(
        setupAdd(tx, b).deps,
        { id: b },
        ref,
      );
      if (!first.ok || !second.ok) throw new Error("esperava sucesso");
      expect(second.value.titleId).toBe(first.value.titleId);
    }));

  it("não troca a situação de quem já tinha o título", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const { deps } = setupAdd(tx, user);
      const first = await addTitleToLibraryByRef(deps, { id: user }, ref);
      if (!first.ok) throw new Error("esperava sucesso");
      await run(tx, user, (d, u) =>
        setTitleStatus(d, u, {
          titleId: first.value.titleId,
          status: "watching",
        }),
      );
      await addTitleToLibraryByRef(deps, { id: user }, ref);
      const rows = await tx
        .select({ status: userTitles.status })
        .from(userTitles)
        .where(eq(userTitles.userId, user));
      expect(rows).toEqual([{ status: "watching" }]);
    }));

  it("informa quais referências já estão na biblioteca, numa consulta só", () =>
    inRollback(async (tx) => {
      const a = await createUser(tx);
      const b = await createUser(tx);
      const { deps } = setupAdd(tx, a);
      await addTitleToLibraryByRef(deps, { id: a }, ref);
      const wanted: CatalogRef[] = [
        { mediaType: "tv", externalId: ref.externalId },
        { mediaType: "movie", externalId: ref.externalId },
        { mediaType: "tv", externalId: "111" },
      ];
      const inLibraryOf = (user: string) =>
        asUser(tx, user, (utx) =>
          createLibraryRepository(utx, "teste").findRefsInLibrary(user, wanted),
        );
      expect(await inLibraryOf(a)).toEqual([ref]);
      // Outra pessoa não vê o que não guardou, e lista vazia não consulta.
      expect(await inLibraryOf(b)).toEqual([]);
      expect(
        await createLibraryRepository(tx, "teste").findRefsInLibrary(a, []),
      ).toEqual([]);
    }));
});
