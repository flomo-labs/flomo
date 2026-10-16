import { describe, expect, it, vi } from "vitest";
import { CatalogUnavailableError } from "./ports";
import { normalizeSearchQuery, searchCatalog } from "./search-catalog";
import { fakeDeps, NOW, searchPage } from "./test-fakes";

const PAST = new Date(NOW.getTime() - 1000);
const FUTURE = new Date(NOW.getTime() + 1000);
const KEY = "search:pt-BR:1:breaking bad";

describe("normalizeSearchQuery", () => {
  it("ignora espaços extras e maiúsculas", () => {
    expect(normalizeSearchQuery("  Breaking   BAD ")).toBe("breaking bad");
  });

  it("unifica formas Unicode equivalentes", () => {
    expect(normalizeSearchQuery("Coração")).toBe("coração");
  });
});

describe("searchCatalog", () => {
  it("valida a entrada", async () => {
    const { deps, provider } = fakeDeps();
    for (const input of [{ query: "   " }, { query: "x".repeat(101) }, {}]) {
      const result = await searchCatalog(deps, input);
      expect(result).toMatchObject({
        ok: false,
        error: { code: "INVALID_INPUT" },
      });
    }
    expect(provider.search).not.toHaveBeenCalled();
  });

  it("sem cache, busca no provedor, grava com prazo de 1 dia e devolve", async () => {
    const { deps, provider, memory } = fakeDeps();
    const result = await searchCatalog(deps, { query: " Breaking  Bad " });

    expect(result).toEqual({ ok: true, value: searchPage() });
    expect(provider.search).toHaveBeenCalledWith("breaking bad", 1, "pt-BR");
    expect(memory.searches.get(KEY)?.expiresAt).toEqual(
      new Date(NOW.getTime() + 24 * 60 * 60 * 1000),
    );
  });

  it("com cache válido, não chama o provedor", async () => {
    const { deps, provider, memory, tasks } = fakeDeps();
    memory.searches.set(KEY, {
      value: searchPage("Do cache"),
      expiresAt: FUTURE,
    });

    const result = await searchCatalog(deps, { query: "breaking bad" });

    expect(result).toEqual({ ok: true, value: searchPage("Do cache") });
    expect(provider.search).not.toHaveBeenCalled();
    expect(tasks).toHaveLength(0);
  });

  it("com cache vencido, responde com ele e atualiza depois da resposta", async () => {
    const { deps, provider, memory, runBackground } = fakeDeps();
    memory.searches.set(KEY, { value: searchPage("Antigo"), expiresAt: PAST });

    const result = await searchCatalog(deps, { query: "breaking bad" });
    expect(result).toEqual({ ok: true, value: searchPage("Antigo") });
    expect(provider.search).not.toHaveBeenCalled();

    await runBackground();
    expect(provider.search).toHaveBeenCalledOnce();
    expect(memory.searches.get(KEY)?.value).toEqual(searchPage());
  });

  it("separa o cache por página", async () => {
    const { deps, provider } = fakeDeps();
    await searchCatalog(deps, { query: "breaking bad", page: 2 });
    expect(provider.search).toHaveBeenCalledWith("breaking bad", 2, "pt-BR");
  });

  it("com o provedor fora do ar e sem cache, devolve CATALOG_UNAVAILABLE", async () => {
    const { deps } = fakeDeps({
      provider: {
        search: vi.fn(async () => {
          throw new CatalogUnavailableError("fora do ar");
        }),
      },
    });
    const result = await searchCatalog(deps, { query: "breaking bad" });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "CATALOG_UNAVAILABLE" },
    });
  });

  it("buscas iguais e simultâneas viram uma só ida ao provedor", async () => {
    const { deps, provider } = fakeDeps();
    await Promise.all([
      searchCatalog(deps, { query: "Breaking Bad" }),
      searchCatalog(deps, { query: "breaking bad" }),
    ]);
    expect(provider.search).toHaveBeenCalledOnce();
  });
});
