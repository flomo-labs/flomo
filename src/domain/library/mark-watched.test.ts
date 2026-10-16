import { describe, expect, it } from "vitest";
import {
  markEpisodeWatched,
  markMovieWatched,
  setWatchDate,
  todayIn,
  unmarkEpisodeWatched,
  unmarkMovieWatched,
} from "./mark-watched";
import { createFakeLibrary, type FakeEpisode, NOW, USER } from "./test-fakes";

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

  it("muda o status de Quero ver, Pausado e Abandonado, mas não de Visto", async () => {
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
  it("grava agora, põe o filme em Visto e é idempotente", async () => {
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
  it("episódio: apaga progresso e histórico, sem mudar o status", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id });
    expect(
      await unmarkEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id }),
    ).toEqual({ ok: true, value: { removed: true } });
    expect(lib.watched()).toEqual([]);
    expect(lib.events).toHaveLength(0);
    expect(lib.status(SERIES)).toBe("watching");

    expect(
      await unmarkEpisodeWatched(lib.deps, USER, { episodeId: S1E1.id }),
    ).toEqual({ ok: true, value: { removed: false } });
  });

  it("filme: apaga o histórico", async () => {
    const lib = setup();
    await markMovieWatched(lib.deps, USER, { titleId: MOVIE });
    expect(
      await unmarkMovieWatched(lib.deps, USER, { titleId: MOVIE }),
    ).toEqual({ ok: true, value: { removed: true } });
    expect(lib.events).toHaveLength(0);
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

describe("todayIn", () => {
  it("usa o fuso do Brasil", () => {
    // 01:00 UTC ainda é o dia anterior em São Paulo.
    expect(todayIn("BR", new Date("2026-10-17T01:00:00Z"))).toBe("2026-10-16");
  });
});
