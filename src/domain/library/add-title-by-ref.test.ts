import { describe, expect, it, vi } from "vitest";
import type { CatalogProvider } from "../catalog/ports";
import { memoryStore, providerTitle, NOW } from "../catalog/test-fakes";
import { CatalogUnavailableError } from "../catalog/ports";
import { addTitleToLibraryByRef, type AddByRefDeps } from "./add-title-by-ref";
import { createFakeLibrary, USER } from "./test-fakes";

const REF = { mediaType: "tv", externalId: "1399" };

function setup(
  options: {
    fetchTitle?: CatalogProvider["fetchTitle"];
    allow?: boolean;
  } = {},
) {
  const { store } = memoryStore();
  const fetchTitle = vi.fn(options.fetchTitle ?? (async () => providerTitle()));
  const provider = { fetchTitle } as unknown as CatalogProvider;
  const lib = createFakeLibrary({});
  const allow = vi.fn(() => options.allow ?? true);
  const deps: AddByRefDeps = {
    catalog: { provider, store, now: () => NOW, background: vi.fn() },
    inLibrary: (run) => run(lib.deps),
    allowProviderFetch: allow,
  };
  return { deps, lib, fetchTitle, allow };
}

describe("addTitleToLibraryByRef", () => {
  it("grava o título fora do catálogo e põe em Quero ver", async () => {
    const { deps, lib, fetchTitle } = setup();
    const result = await addTitleToLibraryByRef(deps, USER, REF);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.added).toBe(true);
    expect(fetchTitle).toHaveBeenCalledTimes(1);
    expect(lib.status(result.value.titleId)).toBe("watchlist");
    expect(lib.watched()).toHaveLength(0);
  });

  it("é idempotente: a segunda vez não chama o provedor nem muda nada", async () => {
    const { deps, lib, fetchTitle } = setup();
    const first = await addTitleToLibraryByRef(deps, USER, REF);
    const second = await addTitleToLibraryByRef(deps, USER, REF);
    if (!first.ok || !second.ok) throw new Error("esperava sucesso");
    expect(second.value).toEqual({
      titleId: first.value.titleId,
      added: false,
    });
    expect(fetchTitle).toHaveBeenCalledTimes(1);
    expect(lib.status(first.value.titleId)).toBe("watchlist");
  });

  it("não troca a situação de um título que já estava na biblioteca", async () => {
    const { deps, lib } = setup();
    const first = await addTitleToLibraryByRef(deps, USER, REF);
    if (!first.ok) throw new Error("esperava sucesso");
    lib.setStatus(first.value.titleId, "watching");
    const again = await addTitleToLibraryByRef(deps, USER, REF);
    expect(again).toMatchObject({ ok: true, value: { added: false } });
    expect(lib.status(first.value.titleId)).toBe("watching");
  });

  it("duas pessoas com o mesmo título novo dividem uma busca só", async () => {
    const { deps, fetchTitle } = setup();
    const other = { id: "22222222-2222-4222-8222-222222222222" };
    const [a, b] = await Promise.all([
      addTitleToLibraryByRef(deps, USER, REF),
      addTitleToLibraryByRef(deps, other, REF),
    ]);
    if (!a.ok || !b.ok) throw new Error("esperava sucesso");
    expect(a.value.titleId).toBe(b.value.titleId);
    expect(fetchTitle).toHaveBeenCalledTimes(1);
  });

  it("devolve CATALOG_UNAVAILABLE quando o provedor falha e não grava", async () => {
    const { deps, lib } = setup({
      fetchTitle: async () => {
        throw new CatalogUnavailableError("fora do ar");
      },
    });
    expect(await addTitleToLibraryByRef(deps, USER, REF)).toMatchObject({
      ok: false,
      error: { code: "CATALOG_UNAVAILABLE" },
    });
    expect(lib.libraryCount()).toBe(0);
  });

  it("devolve TITLE_NOT_FOUND quando o provedor não conhece o título", async () => {
    const { deps } = setup({ fetchTitle: async () => null });
    expect(await addTitleToLibraryByRef(deps, USER, REF)).toMatchObject({
      ok: false,
      error: { code: "TITLE_NOT_FOUND" },
    });
  });

  it("recusa referência inválida", async () => {
    const { deps, fetchTitle } = setup();
    for (const input of [
      null,
      { mediaType: "tv", externalId: "abc" },
      { mediaType: "person", externalId: "1" },
    ]) {
      expect(await addTitleToLibraryByRef(deps, USER, input)).toMatchObject({
        ok: false,
        error: { code: "INVALID_INPUT" },
      });
    }
    expect(fetchTitle).not.toHaveBeenCalled();
  });

  it("aplica o limite só a título novo", async () => {
    const limited = setup({ allow: false });
    expect(await addTitleToLibraryByRef(limited.deps, USER, REF)).toMatchObject(
      { ok: false, error: { code: "RATE_LIMITED" } },
    );
    expect(limited.fetchTitle).not.toHaveBeenCalled();

    // Título já no catálogo não passa pelo limite.
    const { deps, allow } = setup();
    await addTitleToLibraryByRef(deps, USER, REF);
    allow.mockClear();
    await addTitleToLibraryByRef(deps, USER, REF);
    expect(allow).not.toHaveBeenCalled();
  });
});
