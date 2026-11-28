import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addRecentSearch,
  loadRecentSearches,
  parseRecentSearches,
  RECENT_SEARCHES_MAX,
  removeRecentSearch,
  saveRecentSearches,
  type RecentSearch,
} from "./recent-searches";

afterEach(() => vi.unstubAllGlobals());

const q = (term: string): RecentSearch => ({ kind: "query", term });
const title: RecentSearch = {
  kind: "title",
  mediaType: "tv",
  externalId: "1",
  title: "Dark",
  year: "2017",
  posterPath: "/d.jpg",
};
const person: RecentSearch = {
  kind: "person",
  handle: "ana",
  displayName: "Ana Souza",
};

describe("addRecentSearch", () => {
  it("põe o item mais novo no topo", () => {
    expect(addRecentSearch([q("a"), q("b")], q("c"))).toEqual([
      q("c"),
      q("a"),
      q("b"),
    ]);
  });
  it("termo não repete (sem diferenciar maiúsculas) e sobe", () => {
    expect(addRecentSearch([q("a"), q("Dark"), q("b")], q("dark"))).toEqual([
      q("dark"),
      q("a"),
      q("b"),
    ]);
  });
  it("sugestão aceita não repete e sobe com os dados novos", () => {
    const renamed = { ...title, title: "Dark (2017)" };
    expect(addRecentSearch([q("a"), title, person], renamed)).toEqual([
      renamed,
      q("a"),
      person,
    ]);
  });
  it("ignora termo vazio e apara espaços", () => {
    expect(addRecentSearch([q("a")], q("   "))).toEqual([q("a")]);
    expect(addRecentSearch([], q("  x "))).toEqual([q("x")]);
  });
  it("guarda no máximo 8", () => {
    const full = Array.from({ length: 8 }, (_, i) => q(`t${i}`));
    const next = addRecentSearch(full, title);
    expect(next).toHaveLength(RECENT_SEARCHES_MAX);
    expect(next[0]).toEqual(title);
    expect(next).not.toContainEqual(q("t7"));
  });
});

describe("removeRecentSearch", () => {
  it("tira só o item indicado", () => {
    expect(removeRecentSearch([q("a"), title, person], q("A"))).toEqual([
      title,
      person,
    ]);
    expect(removeRecentSearch([q("a"), title], title)).toEqual([q("a")]);
  });
});

describe("parseRecentSearches", () => {
  it("texto solto (formato antigo) vira termo", () => {
    expect(parseRecentSearches('["a"," b ",1,""]')).toEqual([q("a"), q("b")]);
  });
  it("lê títulos e usuários e descarta o inválido", () => {
    const raw = JSON.stringify([
      title,
      person,
      { kind: "title", mediaType: "xx", externalId: "1", title: "t" },
      { kind: "person" },
      null,
    ]);
    expect(parseRecentSearches(raw)).toEqual([title, person]);
  });
  it("valores inválidos viram lista vazia", () => {
    expect(parseRecentSearches(null)).toEqual([]);
    expect(parseRecentSearches("{")).toEqual([]);
    expect(parseRecentSearches('{"a":1}')).toEqual([]);
  });
});

describe("localStorage indisponível", () => {
  const broken = {
    getItem: () => {
      throw new Error("bloqueado");
    },
    setItem: () => {
      throw new Error("bloqueado");
    },
    removeItem: () => {
      throw new Error("bloqueado");
    },
  };
  it("não lança ao ler nem ao gravar", () => {
    vi.stubGlobal("localStorage", broken);
    expect(loadRecentSearches()).toEqual([]);
    expect(() => saveRecentSearches([q("a")])).not.toThrow();
    expect(() => saveRecentSearches([])).not.toThrow();
  });
});
