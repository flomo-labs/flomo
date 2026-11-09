import { describe, expect, it } from "vitest";
import {
  markEpisodeWatched,
  markMovieWatched,
  markSeasonWatched,
  unmarkEpisodesWatched,
  rewatchEpisode,
  deleteWatchRecord,
  rewatchMovie,
  setWatchDate,
  unmarkEpisodeWatched,
  unmarkMovieWatched,
} from "./mark-watched";
import { todayIn } from "./watch-date";
import { createFakeLibrary, type FakeEpisode, NOW, USER } from "./test-fakes";

const OTHER_USER = { id: "22222222-2222-4222-8222-222222222222" };
const SERIES = "aaaaaaaa-0000-4000-8000-000000000001";
const MOVIE = "aaaaaaaa-0000-4000-8000-000000000002";

function ep(
  season: number,
  episode: number,
  airDate: string | null = "2020-01-01",
): FakeEpisode {
  const id = `bbbbbbbb-0000-4000-8000-${String(season * 100 + episode).padStart(12, "0")}`;
  return {
    id,
    titleId: SERIES,
    seasonNumber: season,
    episodeNumber: episode,
    airDate,
  };
}

const S0E1 = ep(0, 1);
const S1E1 = ep(1, 1);
const S1E2 = ep(1, 2);
const S1E3 = ep(1, 3, null);
const S2E1 = ep(2, 1);
const S2E2 = ep(2, 2);
const S2E3 = ep(2, 3, "2026-10-17"); // ainda não lançado em NOW

function setup() {
  return createFakeLibrary({
    titles: { [SERIES]: "tv", [MOVIE]: "movie" },
    episodes: [S0E1, S1E1, S1E2, S1E3, S2E1, S2E2, S2E3],
  });
}

describe("markEpisodeWatched", () => {
  it("por padrão grava agora, como marcado na hora, e põe a série em Assistindo", async () => {
    const lib = setup();
    const result = await markEpisodeWatched(lib.deps, USER, {
      episodeId: S1E1.id,
    });

    expect(result).toEqual({
      ok: true,
      value: { marked: true, previousMarked: 0 },
    });
    expect(lib.status(SERIES)).toBe("watching");
    expect(lib.progress(S1E1.id)).toEqual(NOW);
    expect(lib.events).toMatchObject([
      {
        titleId: SERIES,
        episodeId: S1E1.id,
        watchedAt: NOW,
        precision: "exact",
        source: "live",
      },
    ]);
  });

  it("é idempotente: marcar de novo não grava nada", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id });
    const again = await markEpisodeWatched(lib.deps, USER, {
      episodeId: S1E1.id,
    });

    expect(again).toEqual({
      ok: true,
      value: { marked: false, previousMarked: 0 },
    });
    expect(lib.events).toHaveLength(1);
  });

  it("aceita sem data e data informada, como registro retroativo", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, {
      episodeId: S1E1.id,
      when: { kind: "unknown" },
    });
    await markEpisodeWatched(lib.deps, USER, {
      episodeId: S1E2.id,
      when: { kind: "date", precision: "month", value: "2023-05" },
    });
    await markEpisodeWatched(lib.deps, USER, {
      episodeId: S2E1.id,
      when: { kind: "date", precision: "day", value: "2024-02-29" },
    });

    expect(lib.events.map((e) => [e.watchedAt, e.precision, e.source])).toEqual(
      [
        [null, "unknown", "backfill"],
        [new Date("2023-05-01T12:00:00Z"), "month", "backfill"],
        [new Date("2024-02-29T12:00:00Z"), "day", "backfill"],
      ],
    );
    // O progresso só guarda datas com o dia.
    expect(lib.progress(S1E2.id)).toBeNull();
    expect(lib.progress(S2E1.id)).toEqual(new Date("2024-02-29T12:00:00Z"));
  });

  it("recusa data futura, inexistente ou antes de 1900", async () => {
    const lib = setup();
    for (const when of [
      { kind: "date", precision: "day", value: "2026-10-18" },
      { kind: "date", precision: "day", value: "2023-02-30" },
      { kind: "date", precision: "year", value: "1899" },
    ]) {
      const result = await markEpisodeWatched(lib.deps, USER, {
        episodeId: S1E1.id,
        when,
      });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "INVALID_DATE" },
      });
    }
    expect(lib.events).toHaveLength(0);
  });

  it("marcar anteriores: o clicado agora, os anteriores lançados sem data", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, { episodeId: S1E2.id });
    const result = await markEpisodeWatched(lib.deps, USER, {
      episodeId: S2E2.id,
      includePrevious: true,
    });

    expect(result).toEqual({
      ok: true,
      value: { marked: true, previousMarked: 3 },
    });
    // Sem especiais; S1E2 já estava visto; S1E3 sem data no catálogo entra.
    expect(lib.watched().sort()).toEqual(
      [S1E1.id, S1E2.id, S1E3.id, S2E1.id, S2E2.id].sort(),
    );
    const backfill = lib.events.filter((e) => e.source === "backfill");
    expect(backfill.map((e) => e.episodeId)).toEqual([
      S1E1.id,
      S1E3.id,
      S2E1.id,
    ]);
    expect(backfill.every((e) => e.watchedAt === null)).toBe(true);
    expect(lib.progress(S2E2.id)).toEqual(NOW);
  });

  it("não marca como anterior o que ainda não foi lançado", async () => {
    const lib = setup();
    const result = await markEpisodeWatched(lib.deps, USER, {
      episodeId: S2E3.id,
      includePrevious: true,
    });
    expect(result).toMatchObject({ value: { previousMarked: 5 } });
    expect(lib.watched()).not.toContain(S0E1.id);
  });

  it("muda o status de Quero ver, Pausado e Abandonado, mas não de Assistido", async () => {
    for (const [before, after] of [
      ["watchlist", "watching"],
      ["paused", "watching"],
      ["dropped", "watching"],
      ["watched", "watched"],
    ] as const) {
      const lib = setup();
      lib.setStatus(SERIES, before);
      await markEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id });
      expect(lib.status(SERIES)).toBe(after);
    }
  });

  it("recusa entrada inválida e episódio inexistente", async () => {
    const lib = setup();
    expect(
      await markEpisodeWatched(lib.deps, USER, { episodeId: "x" }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(
      await markEpisodeWatched(lib.deps, USER, {
        episodeId: "cccccccc-0000-4000-8000-000000000000",
      }),
    ).toMatchObject({ ok: false, error: { code: "EPISODE_NOT_FOUND" } });
  });
});

describe("markMovieWatched", () => {
  it("grava agora, põe o filme em Assistido e é idempotente", async () => {
    const lib = setup();
    lib.setStatus(MOVIE, "watchlist");
    expect(await markMovieWatched(lib.deps, USER, { titleId: MOVIE })).toEqual({
      ok: true,
      value: { marked: true },
    });
    expect(await markMovieWatched(lib.deps, USER, { titleId: MOVIE })).toEqual({
      ok: true,
      value: { marked: false },
    });

    expect(lib.status(MOVIE)).toBe("watched");
    expect(lib.events).toMatchObject([
      { titleId: MOVIE, episodeId: null, precision: "exact", source: "live" },
    ]);
  });

  it("recusa série e título inexistente", async () => {
    const lib = setup();
    expect(
      await markMovieWatched(lib.deps, USER, { titleId: SERIES }),
    ).toMatchObject({ ok: false, error: { code: "NOT_A_MOVIE" } });
    expect(
      await markMovieWatched(lib.deps, USER, {
        titleId: "cccccccc-0000-4000-8000-000000000000",
      }),
    ).toMatchObject({ ok: false, error: { code: "TITLE_NOT_FOUND" } });
    expect(lib.events).toHaveLength(0);
  });
});

describe("desmarcar", () => {
  it("episódio com um só registro: deixa de estar visto", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id });
    expect(
      await unmarkEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id }),
    ).toEqual({ ok: true, value: { removed: true } });
    expect(lib.watched()).toEqual([]);
    expect(lib.events).toHaveLength(0);
    expect(lib.status(SERIES)).toBe("watchlist");

    expect(
      await unmarkEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id }),
    ).toEqual({ ok: true, value: { removed: false } });
  });

  it("série sem nenhum episódio visto volta a Quero ver; Pausado fica", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id });
    await unmarkEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id });
    expect(lib.status(SERIES)).toBe("watchlist");

    await markEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id });
    lib.setStatus(SERIES, "paused");
    await unmarkEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id });
    expect(lib.status(SERIES)).toBe("paused");
  });

  it("filme com um só registro: apaga o registro", async () => {
    const lib = setup();
    await markMovieWatched(lib.deps, USER, { titleId: MOVIE });
    expect(
      await unmarkMovieWatched(lib.deps, USER, { titleId: MOVIE }),
    ).toEqual({ ok: true, value: { removed: true } });
    expect(lib.events).toHaveLength(0);
    expect(lib.status(MOVIE)).toBe("watchlist");
  });
});

describe("desmarcar com vários registros e apagar registro escolhido", () => {
  it("desmarcar tira só o último; o episódio continua visto com a data do anterior", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, {
      episodeId: S1E1.id,
      when: { kind: "date", precision: "day", value: "2026-10-01" },
    });
    await rewatchEpisode(lib.deps, USER, { episodeId: S1E1.id });
    expect(lib.progress(S1E1.id)).toEqual(NOW);

    await unmarkEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id });
    expect(lib.events).toHaveLength(1);
    expect(lib.watched()).toEqual([S1E1.id]);
    expect(lib.progress(S1E1.id)).toEqual(new Date("2026-10-01T12:00:00Z"));

    await unmarkEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id });
    expect(lib.watched()).toEqual([]);
  });

  it("filme: desmarcar tira só o último registro", async () => {
    const lib = setup();
    await markMovieWatched(lib.deps, USER, { titleId: MOVIE });
    await rewatchMovie(lib.deps, USER, { titleId: MOVIE });
    await unmarkMovieWatched(lib.deps, USER, { titleId: MOVIE });
    expect(lib.events).toHaveLength(1);
    expect(lib.status(MOVIE)).toBe("watched");
  });

  it("apagar um registro do meio mantém os outros e o progresso", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id });
    await rewatchEpisode(lib.deps, USER, { episodeId: S1E1.id });
    await rewatchEpisode(lib.deps, USER, { episodeId: S1E1.id });
    const middle = lib.events[1].id;

    expect(
      await deleteWatchRecord(lib.deps, USER, { eventId: middle }),
    ).toEqual({ ok: true, value: { removed: true } });
    expect(lib.events.map((e) => e.id)).not.toContain(middle);
    expect(lib.events).toHaveLength(2);
    expect(lib.watched()).toEqual([S1E1.id]);
  });

  it("apagar o único registro tira o episódio de visto; id desconhecido ou de outro usuário falha", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id });
    const [only] = lib.events;
    expect(
      await deleteWatchRecord(lib.deps, OTHER_USER, { eventId: only.id }),
    ).toMatchObject({ ok: false, error: { code: "EVENT_NOT_FOUND" } });
    expect(
      await deleteWatchRecord(lib.deps, USER, { eventId: only.id }),
    ).toMatchObject({
      ok: true,
    });
    expect(lib.watched()).toEqual([]);
  });
});

describe("setWatchDate", () => {
  it("tira a data e atualiza o progresso", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id });
    const [event] = lib.events;

    expect(
      await setWatchDate(lib.deps, USER, {
        eventId: "00000000-0000-4000-8000-000000000000",
        when: { kind: "unknown" },
      }),
    ).toMatchObject({ ok: false, error: { code: "EVENT_NOT_FOUND" } });

    // O fake usa ids não uuid; o caso de uso recebe o id já validado.
    event.id = "dddddddd-0000-4000-8000-000000000001";
    const result = await setWatchDate(lib.deps, USER, {
      eventId: event.id,
      when: { kind: "unknown" },
    });
    expect(result.ok).toBe(true);
    expect(event).toMatchObject({
      watchedAt: null,
      precision: "unknown",
      source: "backfill",
    });
    expect(lib.progress(S1E1.id)).toBeNull();
  });

  it("'foi hoje' num registro retroativo vira marcado na hora", async () => {
    const lib = setup();
    await markMovieWatched(lib.deps, USER, {
      titleId: MOVIE,
      when: { kind: "unknown" },
    });
    const [event] = lib.events;
    event.id = "dddddddd-0000-4000-8000-000000000002";
    await setWatchDate(lib.deps, USER, {
      eventId: event.id,
      when: { kind: "now" },
    });
    expect(event).toMatchObject({
      watchedAt: NOW,
      precision: "exact",
      source: "live",
    });
  });
});

describe("datas perto da virada do dia", () => {
  it("recusa amanhã à noite e não grava hoje no futuro de manhã", async () => {
    const night = createFakeLibrary({
      titles: { [MOVIE]: "movie" },
    });
    // 22:00 em São Paulo do dia 16.
    night.deps.now = () => new Date("2026-10-17T01:00:00Z");
    expect(
      await markMovieWatched(night.deps, USER, {
        titleId: MOVIE,
        when: { kind: "date", precision: "day", value: "2026-10-17" },
      }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_DATE" } });

    const morning = createFakeLibrary({ titles: { [MOVIE]: "movie" } });
    const eight = new Date("2026-10-16T11:00:00Z"); // 08:00 em São Paulo
    morning.deps.now = () => eight;
    await markMovieWatched(morning.deps, USER, {
      titleId: MOVIE,
      when: { kind: "date", precision: "day", value: "2026-10-16" },
    });
    expect(morning.events[0]).toMatchObject({
      watchedAt: eight,
      precision: "day",
    });
  });

  it("mensagens de entrada inválida em português", async () => {
    const lib = setup();
    expect(
      await markMovieWatched(lib.deps, USER, { titleId: "x" }),
    ).toMatchObject({ error: { message: "Dados inválidos." } });
    expect(
      await markMovieWatched(lib.deps, USER, {
        titleId: MOVIE,
        when: { kind: "date", precision: "day", value: "2023" },
      }),
    ).toMatchObject({ error: { message: "Data em formato inválido." } });
  });
});

describe("registrar de novo", () => {
  it("episódio visto: grava mais um registro agora, sem repetir o progresso nem mexer no status", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, {
      episodeId: S1E1.id,
      when: { kind: "unknown" },
    });
    lib.setStatus(SERIES, "paused");

    const result = await rewatchEpisode(lib.deps, USER, {
      episodeId: S1E1.id,
    });
    expect(result).toEqual({ ok: true, value: { recorded: true } });
    expect(lib.events).toHaveLength(2);
    expect(lib.events[1]).toMatchObject({
      episodeId: S1E1.id,
      watchedAt: NOW,
      precision: "exact",
      source: "live",
    });
    expect(lib.watched()).toEqual([S1E1.id]);
    expect(lib.progress(S1E1.id)).toEqual(NOW);
    expect(lib.status(SERIES)).toBe("paused");
  });

  it("episódio não visto: recusa", async () => {
    const lib = setup();
    expect(
      await rewatchEpisode(lib.deps, USER, { episodeId: S1E1.id }),
    ).toMatchObject({ ok: false, error: { code: "NOT_WATCHED" } });
    expect(lib.events).toHaveLength(0);
  });

  it("episódio inexistente e data futura", async () => {
    const lib = setup();
    expect(
      await rewatchEpisode(lib.deps, USER, {
        episodeId: "bbbbbbbb-0000-4000-8000-ffffffffffff",
      }),
    ).toMatchObject({ error: { code: "EPISODE_NOT_FOUND" } });
    await markEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id });
    expect(
      await rewatchEpisode(lib.deps, USER, {
        episodeId: S1E1.id,
        when: { kind: "date", precision: "year", value: "2999" },
      }),
    ).toMatchObject({ error: { code: "INVALID_DATE" } });
  });

  it("filme visto: grava mais um registro; não visto ou série: recusa", async () => {
    const lib = setup();
    expect(
      await rewatchMovie(lib.deps, USER, { titleId: MOVIE }),
    ).toMatchObject({ error: { code: "NOT_WATCHED" } });
    await markMovieWatched(lib.deps, USER, { titleId: MOVIE });
    expect(await rewatchMovie(lib.deps, USER, { titleId: MOVIE })).toEqual({
      ok: true,
      value: { recorded: true },
    });
    expect(lib.events).toHaveLength(2);
    expect(lib.status(MOVIE)).toBe("watched");
    expect(
      await rewatchMovie(lib.deps, USER, { titleId: SERIES }),
    ).toMatchObject({ error: { code: "NOT_A_MOVIE" } });
  });
});

describe("série que vira Assistido sozinha", () => {
  function finished(status: "ended" | "canceled" | "returning") {
    return createFakeLibrary({
      titles: { [SERIES]: "tv", [MOVIE]: "movie" },
      // S2E3 ainda não lançado em NOW e a temporada 0 (especial) não contam.
      episodes: [S0E1, S1E1, S1E2, S1E3, S2E1, S2E2, S2E3],
      titleStatus: { [SERIES]: status },
    });
  }
  const released = [S1E1, S1E2, S1E3, S2E1, S2E2];

  it("série encerrada com todos os lançados vistos vira Assistido", async () => {
    const lib = finished("ended");
    await markEpisodeWatched(lib.deps, USER, {
      episodeId: S2E2.id,
      includePrevious: true,
    });
    expect(lib.status(SERIES)).toBe("watched");
  });

  it("série cancelada também; em exibição fica em Assistindo", async () => {
    const canceled = finished("canceled");
    await markEpisodeWatched(canceled.deps, USER, {
      episodeId: S2E2.id,
      includePrevious: true,
    });
    expect(canceled.status(SERIES)).toBe("watched");

    const returning = finished("returning");
    await markEpisodeWatched(returning.deps, USER, {
      episodeId: S2E2.id,
      includePrevious: true,
    });
    expect(returning.status(SERIES)).toBe("watching");
  });

  it("falta um episódio lançado: continua Assistindo", async () => {
    const lib = finished("ended");
    for (const e of released.slice(0, -1)) {
      await markEpisodeWatched(lib.deps, USER, { episodeId: e.id });
    }
    expect(lib.status(SERIES)).toBe("watching");
  });

  it("desmarcar um episódio de série Assistido volta para Assistindo", async () => {
    const lib = finished("ended");
    await markEpisodeWatched(lib.deps, USER, {
      episodeId: S2E2.id,
      includePrevious: true,
    });
    await unmarkEpisodeWatched(lib.deps, USER, { episodeId: S1E2.id });
    expect(lib.status(SERIES)).toBe("watching");
  });

  it("apagar só um dos registros de um episódio não muda o status", async () => {
    const lib = finished("ended");
    await markEpisodeWatched(lib.deps, USER, {
      episodeId: S2E2.id,
      includePrevious: true,
    });
    await rewatchEpisode(lib.deps, USER, { episodeId: S1E2.id });
    await unmarkEpisodeWatched(lib.deps, USER, { episodeId: S1E2.id });
    expect(lib.status(SERIES)).toBe("watched");
  });

  it("Pausado ou Abandonado marcando o último episódio vira Assistido", async () => {
    const lib = finished("ended");
    await markEpisodeWatched(lib.deps, USER, {
      episodeId: S2E2.id,
      includePrevious: true,
    });
    await unmarkEpisodeWatched(lib.deps, USER, { episodeId: S2E2.id });
    lib.setStatus(SERIES, "paused");
    await markEpisodeWatched(lib.deps, USER, { episodeId: S2E2.id });
    expect(lib.status(SERIES)).toBe("watched");
  });
});

describe("todayIn", () => {
  it("usa o fuso do Brasil", () => {
    // 01:00 UTC ainda é o dia anterior em São Paulo.
    expect(todayIn("BR", new Date("2026-10-17T01:00:00Z"))).toBe("2026-10-16");
  });
});

describe("marcar no dia da exibição", () => {
  it("episódio: usa o airDate do catálogo, com precisão de dia, como retroativo", async () => {
    const lib = createFakeLibrary({
      titles: { [SERIES]: "tv" },
      episodes: [
        ep(1, 1, "2024-03-05"),
        ep(1, 2, null),
        ep(1, 3, "2026-10-17"),
      ],
    });
    const [e1, e2, e3] = [ep(1, 1).id, ep(1, 2).id, ep(1, 3).id];

    await markEpisodeWatched(lib.deps, USER, {
      episodeId: e1,
      when: { kind: "airDate" },
    });
    await markEpisodeWatched(lib.deps, USER, {
      episodeId: e2,
      when: { kind: "airDate" },
    });
    const future = await markEpisodeWatched(lib.deps, USER, {
      episodeId: e3,
      when: { kind: "airDate" },
    });

    expect(lib.events).toMatchObject([
      {
        episodeId: e1,
        watchedAt: new Date("2024-03-05T12:00:00Z"),
        precision: "day",
        source: "backfill",
      },
      { episodeId: e2, watchedAt: null, precision: "unknown" },
    ]);
    expect(future).toMatchObject({
      ok: false,
      error: { code: "INVALID_DATE" },
    });
  });

  it("filme: usa a data de lançamento; sem data, fica sem data; futuro é recusado", async () => {
    const lib = createFakeLibrary({
      titles: { [MOVIE]: "movie" },
      releaseDates: { [MOVIE]: "2019-07-01" },
    });
    await markMovieWatched(lib.deps, USER, {
      titleId: MOVIE,
      when: { kind: "airDate" },
    });
    expect(lib.events).toMatchObject([
      { watchedAt: new Date("2019-07-01T12:00:00Z"), precision: "day" },
    ]);

    const noDate = createFakeLibrary({ titles: { [MOVIE]: "movie" } });
    await markMovieWatched(noDate.deps, USER, {
      titleId: MOVIE,
      when: { kind: "airDate" },
    });
    expect(noDate.events).toMatchObject([
      { watchedAt: null, precision: "unknown" },
    ]);

    const future = createFakeLibrary({
      titles: { [MOVIE]: "movie" },
      releaseDates: { [MOVIE]: "2026-12-25" },
    });
    expect(
      await markMovieWatched(future.deps, USER, {
        titleId: MOVIE,
        when: { kind: "airDate" },
      }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_DATE" } });
    expect(future.events).toHaveLength(0);
  });
});

describe("markSeasonWatched", () => {
  const season = (when: unknown, seasonNumber = 2) => ({
    titleId: SERIES,
    seasonNumber,
    when,
  });

  it("marca os episódios lançados da temporada, sem o futuro, e põe a série em Assistindo", async () => {
    const lib = setup();
    const result = await markSeasonWatched(
      lib.deps,
      USER,
      season({ kind: "now" }),
    );

    expect(result).toEqual({
      ok: true,
      value: {
        marked: 2,
        alreadyMarked: 0,
        markedEpisodeIds: [S2E1.id, S2E2.id],
      },
    });
    expect(lib.watched().sort()).toEqual([S2E1.id, S2E2.id]);
    expect(lib.status(SERIES)).toBe("watching");
    expect(lib.events).toMatchObject([
      { watchedAt: NOW, precision: "exact", source: "live" },
      { watchedAt: NOW, precision: "exact", source: "live" },
    ]);
  });

  it("sem data, data escolhida e data de exibição de cada episódio", async () => {
    const unknown = setup();
    await markSeasonWatched(unknown.deps, USER, season({ kind: "unknown" }));
    expect(unknown.events).toMatchObject([
      { watchedAt: null, precision: "unknown", source: "backfill" },
      { watchedAt: null, precision: "unknown", source: "backfill" },
    ]);

    const chosen = setup();
    await markSeasonWatched(
      chosen.deps,
      USER,
      season({ kind: "date", precision: "month", value: "2022-05" }),
    );
    expect(chosen.events).toMatchObject([
      { precision: "month", watchedAt: new Date("2022-05-01T12:00:00Z") },
      { precision: "month", watchedAt: new Date("2022-05-01T12:00:00Z") },
    ]);

    const lib = createFakeLibrary({
      titles: { [SERIES]: "tv" },
      episodes: [
        ep(1, 1, "2024-01-10"),
        ep(1, 2, "2024-01-17"),
        ep(1, 3, null),
      ],
    });
    await markSeasonWatched(lib.deps, USER, season({ kind: "airDate" }, 1));
    expect(lib.events).toMatchObject([
      { watchedAt: new Date("2024-01-10T12:00:00Z"), precision: "day" },
      { watchedAt: new Date("2024-01-17T12:00:00Z"), precision: "day" },
      { watchedAt: null, precision: "unknown" },
    ]);
  });

  it("com throughSeason marca da temporada 1 até a pedida, sem os especiais", async () => {
    const lib = setup();
    const result = await markSeasonWatched(lib.deps, USER, {
      ...season({ kind: "now" }, 2),
      throughSeason: true,
    });
    expect(result).toEqual({
      ok: true,
      value: {
        marked: 5,
        alreadyMarked: 0,
        markedEpisodeIds: [S1E1.id, S1E2.id, S1E3.id, S2E1.id, S2E2.id],
      },
    });
    expect(lib.watched()).not.toContain(S0E1.id);
  });

  it("com throughSeason numa temporada que não existe falha sem gravar", async () => {
    const lib = setup();
    const result = await markSeasonWatched(lib.deps, USER, {
      ...season({ kind: "now" }, 9),
      throughSeason: true,
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "SEASON_NOT_FOUND" },
    });
    expect(lib.events).toHaveLength(0);
  });

  it("recusa data futura ou inválida sem gravar nada", async () => {
    const lib = setup();
    const result = await markSeasonWatched(
      lib.deps,
      USER,
      season({ kind: "date", precision: "day", value: "2026-10-17" }),
    );
    expect(result).toMatchObject({
      ok: false,
      error: { code: "INVALID_DATE" },
    });
    expect(lib.events).toHaveLength(0);
    expect(lib.status(SERIES)).toBeUndefined();
  });

  it("é idempotente: o que já estava visto não muda nem duplica", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, {
      episodeId: S2E1.id,
      when: { kind: "unknown" },
    });
    const result = await markSeasonWatched(
      lib.deps,
      USER,
      season({ kind: "now" }),
    );
    expect(result).toEqual({
      ok: true,
      value: { marked: 1, alreadyMarked: 1, markedEpisodeIds: [S2E2.id] },
    });
    expect(lib.progress(S2E1.id)).toBeNull();

    const again = await markSeasonWatched(
      lib.deps,
      USER,
      season({ kind: "now" }),
    );
    expect(again).toEqual({
      ok: true,
      value: { marked: 0, alreadyMarked: 2, markedEpisodeIds: [] },
    });
    expect(lib.events).toHaveLength(2);
  });

  it("não deixa especiais, filme, título ou temporada inexistentes passarem", async () => {
    const lib = setup();
    for (const [input, code] of [
      [season({ kind: "now" }, 0), "INVALID_INPUT"],
      [season({ kind: "now" }, 9), "SEASON_NOT_FOUND"],
      [{ ...season({ kind: "now" }), titleId: MOVIE }, "NOT_A_SERIES"],
      [
        { ...season({ kind: "now" }), titleId: OTHER_USER.id },
        "TITLE_NOT_FOUND",
      ],
    ] as const) {
      expect(await markSeasonWatched(lib.deps, USER, input)).toMatchObject({
        ok: false,
        error: { code },
      });
    }
    expect(lib.events).toHaveLength(0);
  });

  it("série encerrada com tudo visto vira Assistido; desfazer devolve a Assistindo", async () => {
    const lib = createFakeLibrary({
      titles: { [SERIES]: "tv" },
      episodes: [ep(1, 1), ep(1, 2)],
      titleStatus: { [SERIES]: "ended" },
    });
    const done = await markSeasonWatched(
      lib.deps,
      USER,
      season({ kind: "now" }, 1),
    );
    expect(lib.status(SERIES)).toBe("watched");

    if (!done.ok) throw new Error("esperava ok");
    const undone = await unmarkEpisodesWatched(lib.deps, USER, {
      episodeIds: done.value.markedEpisodeIds,
    });
    expect(undone).toEqual({ ok: true, value: { removed: 2 } });
    expect(lib.watched()).toEqual([]);
    expect(lib.events).toHaveLength(0);
    expect(lib.status(SERIES)).toBe("watchlist");
  });
});

describe("data de exibição nos anteriores e na troca de data", () => {
  it("marcar anteriores com airDate dá a cada anterior a própria data de exibição", async () => {
    const lib = createFakeLibrary({
      titles: { [SERIES]: "tv" },
      episodes: [
        ep(1, 1, "2024-01-10"),
        ep(1, 2, null),
        ep(1, 3, "2024-01-24"),
      ],
    });
    await markEpisodeWatched(lib.deps, USER, {
      episodeId: ep(1, 3).id,
      when: { kind: "airDate" },
      includePrevious: true,
    });
    expect(lib.events).toMatchObject([
      { episodeId: ep(1, 3).id, watchedAt: new Date("2024-01-24T12:00:00Z") },
      { episodeId: ep(1, 1).id, watchedAt: new Date("2024-01-10T12:00:00Z") },
      { episodeId: ep(1, 2).id, watchedAt: null, precision: "unknown" },
    ]);
  });

  it("trocar a data de um registro para a data de exibição; outra pessoa não acha", async () => {
    const lib = createFakeLibrary({
      titles: { [SERIES]: "tv" },
      episodes: [ep(1, 1, "2024-01-10")],
    });
    await markEpisodeWatched(lib.deps, USER, { episodeId: ep(1, 1).id });
    const eventId = lib.events[0].id;

    expect(
      await setWatchDate(lib.deps, OTHER_USER, {
        eventId,
        when: { kind: "airDate" },
      }),
    ).toMatchObject({ ok: false, error: { code: "EVENT_NOT_FOUND" } });
    expect(
      await setWatchDate(lib.deps, USER, {
        eventId,
        when: { kind: "airDate" },
      }),
    ).toEqual({ ok: true, value: { eventId } });
    expect(lib.events[0]).toMatchObject({
      watchedAt: new Date("2024-01-10T12:00:00Z"),
      precision: "day",
      source: "backfill",
    });
    expect(lib.progress(ep(1, 1).id)).toEqual(new Date("2024-01-10T12:00:00Z"));
  });
});
