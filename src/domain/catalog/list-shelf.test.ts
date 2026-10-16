import { describe, expect, it, vi } from "vitest";
import { listShelf } from "./list-shelf";
import { CatalogUnavailableError } from "./ports";
import { fakeDeps, NOW, shelfItems } from "./test-fakes";

const HOUR_MS = 60 * 60 * 1000;
const TRENDING = { kind: "trending" };
const NETFLIX_TV = { kind: "provider", mediaType: "tv", providerId: "8" };

describe("listShelf", () => {
  it("valida a entrada: tipo desconhecido e serviço fora da lista", async () => {
    const { deps, provider } = fakeDeps();
    for (const input of [
      { kind: "popular" },
      { kind: "provider", mediaType: "tv", providerId: "999" },
      { kind: "provider", mediaType: "person", providerId: "8" },
      { kind: "provider", mediaType: "", providerId: "8" },
      { kind: "provider", mediaType: "tv", providerId: "8&with_genres=1" },
      null,
    ]) {
      expect(await listShelf(deps, input)).toMatchObject({
        ok: false,
        error: { code: "INVALID_INPUT" },
      });
    }
    expect(provider.fetchShelf).not.toHaveBeenCalled();
  });

  it("busca no provedor (BR, pt-BR, 10 itens) e guarda por 6 horas", async () => {
    const { deps, provider, memory } = fakeDeps();
    expect(await listShelf(deps, NETFLIX_TV)).toEqual({
      ok: true,
      value: shelfItems(),
    });
    expect(provider.fetchShelf).toHaveBeenCalledWith(
      NETFLIX_TV,
      "BR",
      "pt-BR",
      10,
    );
    expect(
      memory.shelves.get("shelf:pt-BR:BR:provider:tv:8")?.expiresAt,
    ).toEqual(new Date(NOW.getTime() + 6 * HOUR_MS));
  });

  it("aceita todos os tipos (all) e guarda em chave própria", async () => {
    const { deps, memory } = fakeDeps();
    const input = { kind: "provider", mediaType: "all", providerId: "8" };
    expect(await listShelf(deps, input)).toMatchObject({ ok: true });
    expect([...memory.shelves.keys()]).toEqual([
      "shelf:pt-BR:BR:provider:all:8",
    ]);
  });

  it("lista vazia não vai para o cache", async () => {
    const { deps, provider, memory } = fakeDeps({
      provider: { fetchShelf: vi.fn(async () => []) },
    });
    expect(await listShelf(deps, TRENDING)).toEqual({ ok: true, value: [] });
    expect(memory.shelves.size).toBe(0);
    await listShelf(deps, TRENDING);
    expect(provider.fetchShelf).toHaveBeenCalledTimes(2);
  });

  it("chaves de cache separam as prateleiras", async () => {
    const { deps, memory } = fakeDeps();
    await listShelf(deps, TRENDING);
    await listShelf(deps, { kind: "now_playing" });
    expect([...memory.shelves.keys()].sort()).toEqual([
      "shelf:pt-BR:BR:now_playing",
      "shelf:pt-BR:BR:trending",
    ]);
  });

  it("cache válido: não chama o provedor", async () => {
    const { deps, provider } = fakeDeps();
    await listShelf(deps, TRENDING);
    await listShelf(deps, TRENDING);
    expect(provider.fetchShelf).toHaveBeenCalledTimes(1);
  });

  it("cache vencido: devolve o gravado e atualiza depois da resposta", async () => {
    const { deps, provider, memory, runBackground } = fakeDeps();
    memory.shelves.set("shelf:pt-BR:BR:trending", {
      value: shelfItems(1),
      expiresAt: new Date(NOW.getTime() - 1),
    });
    const result = await listShelf(deps, TRENDING);
    expect(result).toEqual({ ok: true, value: shelfItems(1) });
    expect(provider.fetchShelf).not.toHaveBeenCalled();
    await runBackground();
    expect(provider.fetchShelf).toHaveBeenCalledTimes(1);
    expect(memory.shelves.get("shelf:pt-BR:BR:trending")?.value).toHaveLength(
      2,
    );
  });

  it("provedor fora do ar e sem cache: CATALOG_UNAVAILABLE", async () => {
    const { deps } = fakeDeps({
      provider: {
        fetchShelf: vi.fn(async () => {
          throw new CatalogUnavailableError("fora do ar");
        }),
      },
    });
    expect(await listShelf(deps, TRENDING)).toMatchObject({
      ok: false,
      error: { code: "CATALOG_UNAVAILABLE" },
    });
  });
});
