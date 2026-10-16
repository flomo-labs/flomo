import { describe, expect, it } from "vitest";
import { markEpisodeWatched } from "./mark-watched";
import { listLibrary } from "./list-library";
import {
  removeTitleFromLibrary,
  setTitleHidden,
  setTitleStatus,
} from "./set-status";
import { createFakeLibrary, type FakeEpisode, USER } from "./test-fakes";

const SERIES = "aaaaaaaa-0000-4000-8000-000000000001";
const E1: FakeEpisode = {
  id: "bbbbbbbb-0000-4000-8000-000000000101",
  titleId: SERIES,
  seasonNumber: 1,
  episodeNumber: 1,
  airDate: "2020-01-01",
};

function setup() {
  return createFakeLibrary({ titles: { [SERIES]: "tv" }, episodes: [E1] });
}

describe("setTitleStatus", () => {
  it("põe o título na biblioteca sem marcar nada", async () => {
    const lib = setup();
    const result = await setTitleStatus(lib.deps, USER, {
      titleId: SERIES,
      status: "watchlist",
    });
    expect(result.ok).toBe(true);
    expect(lib.status(SERIES)).toBe("watchlist");
    expect(lib.watched()).toHaveLength(0);
  });

  it("troca a situação atual, inclusive de Assistido", async () => {
    const lib = setup();
    lib.setStatus(SERIES, "watched");
    await setTitleStatus(lib.deps, USER, { titleId: SERIES, status: "paused" });
    expect(lib.status(SERIES)).toBe("paused");
  });

  it("recusa Assistido, que vem de marcar o que foi visto", async () => {
    const lib = setup();
    expect(
      await setTitleStatus(lib.deps, USER, {
        titleId: SERIES,
        status: "watched",
      }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(lib.status(SERIES)).toBeUndefined();
  });

  it("recusa título que não existe", async () => {
    expect(
      await setTitleStatus(setup().deps, USER, {
        titleId: "aaaaaaaa-0000-4000-8000-0000000000ff",
        status: "watchlist",
      }),
    ).toMatchObject({ ok: false, error: { code: "TITLE_NOT_FOUND" } });
  });
});

describe("removeTitleFromLibrary", () => {
  it("tira o título e guarda o que foi marcado", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, { episodeId: E1.id });
    const result = await removeTitleFromLibrary(lib.deps, USER, {
      titleId: SERIES,
    });
    expect(result.ok).toBe(true);
    expect(lib.status(SERIES)).toBeUndefined();
    expect(lib.watched()).toEqual([E1.id]);
  });

  it("é idempotente e recusa id inválido", async () => {
    const lib = setup();
    expect(
      (await removeTitleFromLibrary(lib.deps, USER, { titleId: SERIES })).ok,
    ).toBe(true);
    expect(
      await removeTitleFromLibrary(lib.deps, USER, { titleId: "x" }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  });
});

describe("setTitleHidden", () => {
  const ids = async (lib: ReturnType<typeof setup>, filter: string) => {
    const r = await listLibrary(lib.deps, USER, { filter });
    return r.ok ? r.value.map((i) => i.titleId) : null;
  };

  it("oculta sem mudar a situação e mostra de novo", async () => {
    const lib = setup();
    lib.setStatus(SERIES, "paused");
    expect(
      (await setTitleHidden(lib.deps, USER, { titleId: SERIES, hidden: true }))
        .ok,
    ).toBe(true);
    expect(lib.status(SERIES)).toBe("paused");
    expect(await ids(lib, "all")).toEqual([]);
    expect(await ids(lib, "paused")).toEqual([]);
    expect(await ids(lib, "hidden")).toEqual([SERIES]);

    await setTitleHidden(lib.deps, USER, { titleId: SERIES, hidden: false });
    expect(await ids(lib, "all")).toEqual([SERIES]);
    expect(await ids(lib, "hidden")).toEqual([]);
  });

  it("só oculta título que está na biblioteca", async () => {
    expect(
      await setTitleHidden(setup().deps, USER, {
        titleId: SERIES,
        hidden: true,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOT_IN_LIBRARY" } });
  });

  it("marcar um episódio traz o título oculto de volta", async () => {
    const lib = setup();
    lib.setStatus(SERIES, "watching");
    await setTitleHidden(lib.deps, USER, { titleId: SERIES, hidden: true });
    await markEpisodeWatched(lib.deps, USER, { episodeId: E1.id });
    expect(await ids(lib, "hidden")).toEqual([]);
    expect(await ids(lib, "all")).toEqual([SERIES]);
  });

  it("remover da biblioteca também tira o ocultar", async () => {
    const lib = setup();
    lib.setStatus(SERIES, "watching");
    await setTitleHidden(lib.deps, USER, { titleId: SERIES, hidden: true });
    await removeTitleFromLibrary(lib.deps, USER, { titleId: SERIES });
    await setTitleStatus(lib.deps, USER, {
      titleId: SERIES,
      status: "watchlist",
    });
    expect(await ids(lib, "all")).toEqual([SERIES]);
  });
});
