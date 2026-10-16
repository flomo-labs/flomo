import { describe, expect, it, vi } from "vitest";
import { CatalogUnavailableError } from "./ports";
import { fakeDeps, NOW, providerTitle } from "./test-fakes";
import { getTitle, getTitleByRef, listSeasonEpisodes } from "./titles";

const DAY_MS = 24 * 60 * 60 * 1000;
const REF = { mediaType: "tv", externalId: "1399" };

describe("getTitleByRef", () => {
  it("valida a referência", async () => {
    const { deps, provider } = fakeDeps();
    for (const input of [
      { mediaType: "person", externalId: "1" },
      { mediaType: "tv", externalId: "abc" },
      { mediaType: "tv", externalId: "0" },
      { mediaType: "tv", externalId: "../1" },
    ]) {
      const result = await getTitleByRef(deps, input);
      expect(result).toMatchObject({
        ok: false,
        error: { code: "INVALID_INPUT" },
      });
    }
    expect(provider.fetchTitle).not.toHaveBeenCalled();
  });

  it("título novo: busca no provedor, grava e devolve com uuid do Flomo", async () => {
    const { deps, provider } = fakeDeps();
    const result = await getTitleByRef(deps, REF);

    expect(provider.fetchTitle).toHaveBeenCalledWith(REF, "pt-BR");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      title: "A Guerra dos Tronos",
      originalTitle: "Game of Thrones",
      mediaType: "tv",
      genres: ["Drama"],
      seasons: [{ seasonNumber: 1, episodeCount: 1 }],
    });
    expect(result.value.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("título já gravado e válido: não chama o provedor", async () => {
    const { deps, provider, tasks } = fakeDeps();
    await getTitleByRef(deps, REF);
    await getTitleByRef(deps, REF);
    expect(provider.fetchTitle).toHaveBeenCalledOnce();
    expect(tasks).toHaveLength(0);
  });

  it("título que o provedor não conhece: TITLE_NOT_FOUND", async () => {
    const { deps } = fakeDeps({
      provider: { fetchTitle: vi.fn(async () => null) },
    });
    const result = await getTitleByRef(deps, REF);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "TITLE_NOT_FOUND" },
    });
  });

  it("provedor fora do ar e título fora do cache: CATALOG_UNAVAILABLE", async () => {
    const { deps } = fakeDeps({
      provider: {
        fetchTitle: vi.fn(async () => {
          throw new CatalogUnavailableError("fora do ar");
        }),
      },
    });
    const result = await getTitleByRef(deps, REF);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "CATALOG_UNAVAILABLE" },
    });
  });

  it("prazo do cache depende do tipo e da situação do título", async () => {
    const cases = [
      { title: providerTitle({ status: "ended" }), ttl: 30 * DAY_MS },
      { title: providerTitle({ status: "returning" }), ttl: DAY_MS },
      {
        title: providerTitle({
          ref: { mediaType: "movie", externalId: "603" },
          status: "released",
          seasons: [],
        }),
        ttl: 30 * DAY_MS,
      },
      {
        title: providerTitle({
          ref: { mediaType: "movie", externalId: "604" },
          status: "planned",
          seasons: [],
        }),
        ttl: 2 * DAY_MS,
      },
    ];
    for (const { title, ttl } of cases) {
      const { deps, memory } = fakeDeps({
        provider: { fetchTitle: vi.fn(async () => title) },
      });
      const result = await getTitleByRef(deps, title.ref);
      if (!result.ok) throw new Error("esperava sucesso");
      expect(memory.titles.get(result.value.id)?.expiresAt).toEqual(
        new Date(NOW.getTime() + ttl),
      );
    }
  });
});

describe("getTitle", () => {
  it("valida o uuid", async () => {
    const { deps } = fakeDeps();
    const result = await getTitle(deps, { titleId: "1399" });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
  });

  it("uuid desconhecido: TITLE_NOT_FOUND", async () => {
    const { deps } = fakeDeps();
    const result = await getTitle(deps, {
      titleId: "6f1c1c4e-9a5b-4c7a-8d2e-3b4a5c6d7e8f",
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "TITLE_NOT_FOUND" },
    });
  });

  it("cache vencido: devolve o gravado e atualiza depois da resposta", async () => {
    const { deps, provider, memory, runBackground } = fakeDeps();
    const created = await getTitleByRef(deps, REF);
    if (!created.ok) throw new Error("esperava sucesso");
    const id = created.value.id;
    memory.titles.get(id)!.expiresAt = new Date(NOW.getTime() - 1);
    vi.mocked(provider.fetchTitle).mockResolvedValueOnce(
      providerTitle({
        translation: {
          locale: "pt-BR",
          title: "Título novo",
          overview: null,
          posterPath: null,
        },
      }),
    );

    const stale = await getTitle(deps, { titleId: id });
    expect(stale).toMatchObject({
      ok: true,
      value: { title: "A Guerra dos Tronos" },
    });

    await runBackground();
    const fresh = await getTitle(deps, { titleId: id });
    expect(fresh).toMatchObject({
      ok: true,
      value: { id, title: "Título novo" },
    });
    expect(provider.fetchTitle).toHaveBeenCalledTimes(2);
  });
});

describe("listSeasonEpisodes", () => {
  it("devolve os episódios da temporada, ou TITLE_NOT_FOUND", async () => {
    const { deps } = fakeDeps();
    const created = await getTitleByRef(deps, REF);
    if (!created.ok) throw new Error("esperava sucesso");

    const episodes = await listSeasonEpisodes(deps, {
      titleId: created.value.id,
      seasonNumber: 1,
    });
    expect(episodes).toMatchObject({
      ok: true,
      value: [{ episodeNumber: 1, name: "O Inverno Está Chegando" }],
    });

    const missing = await listSeasonEpisodes(deps, {
      titleId: created.value.id,
      seasonNumber: 9,
    });
    expect(missing).toMatchObject({
      ok: false,
      error: { code: "TITLE_NOT_FOUND" },
    });
  });
});
