import { describe, expect, it } from "vitest";
import {
  clearRecentSearches,
  listRecentSearches,
  recordRecentSearch,
  removeRecentSearch,
} from "./recent-search";
import { createFakeRecentSearches } from "./test-fakes";

const me = { id: "11111111-1111-4111-8111-111111111111" };
const other = { id: "22222222-2222-4222-8222-222222222222" };

const titleInput = (externalId: string) => ({
  kind: "title",
  mediaType: "movie",
  externalId,
  title: `Filme ${externalId}`,
  year: "2020",
  posterPath: "/abc123.jpg",
});

const itemsOf = async (
  deps: ReturnType<typeof createFakeRecentSearches>,
  user = me,
) => {
  const result = await listRecentSearches(deps, user);
  return result.ok ? result.value.items : [];
};

describe("buscas recentes", () => {
  it("registra o termo cortando espaços e lista do mais novo para o mais antigo", async () => {
    const deps = createFakeRecentSearches();
    await recordRecentSearch(deps, me, { kind: "query", term: "  dark  " });
    await recordRecentSearch(deps, me, { kind: "query", term: "lost" });
    expect(await itemsOf(deps)).toEqual([
      { kind: "query", term: "lost" },
      { kind: "query", term: "dark" },
    ]);
  });

  it("não repete: o mesmo termo (sem diferenciar maiúsculas) volta ao topo", async () => {
    const deps = createFakeRecentSearches();
    await recordRecentSearch(deps, me, { kind: "query", term: "Dark" });
    await recordRecentSearch(deps, me, { kind: "query", term: "lost" });
    await recordRecentSearch(deps, me, { kind: "query", term: "dark" });
    expect(await itemsOf(deps)).toEqual([
      { kind: "query", term: "dark" },
      { kind: "query", term: "lost" },
    ]);
  });

  it("guarda no máximo 8 e descarta o mais antigo", async () => {
    const deps = createFakeRecentSearches();
    for (let i = 1; i <= 9; i++) {
      await recordRecentSearch(deps, me, { kind: "query", term: `busca ${i}` });
    }
    const items = await itemsOf(deps);
    expect(items).toHaveLength(8);
    expect(items[0]).toEqual({ kind: "query", term: "busca 9" });
    expect(items.at(-1)).toEqual({ kind: "query", term: "busca 2" });
  });

  it("título e pessoa entram com o que a lista mostra", async () => {
    const deps = createFakeRecentSearches({ "ana.silva": "Ana Silva" });
    await recordRecentSearch(deps, me, titleInput("603"));
    await recordRecentSearch(deps, me, { kind: "person", handle: "Ana.Silva" });
    expect(await itemsOf(deps)).toEqual([
      { kind: "person", handle: "ana.silva", displayName: "Ana Silva" },
      {
        kind: "title",
        mediaType: "movie",
        externalId: "603",
        title: "Filme 603",
        year: "2020",
        posterPath: "/abc123.jpg",
      },
    ]);
  });

  it("pessoa que não pode ser encontrada devolve PERSON_NOT_FOUND e nada é gravado", async () => {
    const deps = createFakeRecentSearches();
    const result = await recordRecentSearch(deps, me, {
      kind: "person",
      handle: "ninguem.aqui",
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "PERSON_NOT_FOUND" },
    });
    expect(await itemsOf(deps)).toEqual([]);
  });

  it.each([
    ["termo vazio", { kind: "query", term: "   " }],
    ["termo grande demais", { kind: "query", term: "a".repeat(101) }],
    ["tipo desconhecido", { kind: "outro", term: "x" }],
    ["id de título inválido", { ...titleInput("0603") }],
    ["tipo de mídia inválido", { ...titleInput("603"), mediaType: "game" }],
    ["pôster inválido", { ...titleInput("603"), posterPath: "javascript:1" }],
    ["ano inválido", { ...titleInput("603"), year: "20x0" }],
    ["handle inválido", { kind: "person", handle: "a" }],
    ["handle provisório", { kind: "person", handle: "u_abcdef123456" }],
    ["sem entrada", undefined],
  ])("recusa entrada inválida: %s", async (_name, input) => {
    const deps = createFakeRecentSearches();
    expect(await recordRecentSearch(deps, me, input)).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    expect(await itemsOf(deps)).toEqual([]);
  });

  it("remove um item, e remover o que não existe não falha", async () => {
    const deps = createFakeRecentSearches();
    await recordRecentSearch(deps, me, { kind: "query", term: "Dark" });
    await recordRecentSearch(deps, me, titleInput("603"));
    expect(
      await removeRecentSearch(deps, me, { kind: "query", term: "dark" }),
    ).toMatchObject({ ok: true });
    expect(
      await removeRecentSearch(deps, me, { kind: "query", term: "dark" }),
    ).toMatchObject({ ok: true });
    expect(await itemsOf(deps)).toHaveLength(1);
    expect(
      await removeRecentSearch(deps, me, { kind: "query", term: "" }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  });

  it("limpar apaga só o histórico de quem pediu", async () => {
    const deps = createFakeRecentSearches();
    await recordRecentSearch(deps, me, { kind: "query", term: "dark" });
    await recordRecentSearch(deps, other, { kind: "query", term: "lost" });
    expect(await clearRecentSearches(deps, me)).toMatchObject({ ok: true });
    expect(await itemsOf(deps)).toEqual([]);
    expect(await itemsOf(deps, other)).toEqual([
      { kind: "query", term: "lost" },
    ]);
  });
});
