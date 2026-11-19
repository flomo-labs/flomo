import { describe, expect, it } from "vitest";
import {
  mediaTypeOf,
  nextSearchHref,
  parseMedia,
  searchHref,
} from "./search-url";

describe("parseMedia", () => {
  it("aceita só series e filmes; o resto vira tudo", () => {
    expect(parseMedia("series")).toBe("series");
    expect(parseMedia("filmes")).toBe("filmes");
    expect(parseMedia("tudo")).toBe("tudo");
    expect(parseMedia("tv")).toBe("tudo");
    expect(parseMedia("")).toBe("tudo");
    expect(parseMedia(null)).toBe("tudo");
    expect(parseMedia(undefined)).toBe("tudo");
  });
});

describe("mediaTypeOf", () => {
  it("mapeia para o tipo do catálogo", () => {
    expect(mediaTypeOf("series")).toBe("tv");
    expect(mediaTypeOf("filmes")).toBe("movie");
    expect(mediaTypeOf("tudo")).toBeUndefined();
  });
});

describe("searchHref", () => {
  it("Tudo leva só o termo", () => {
    expect(searchHref({ query: "office" })).toBe("/buscar?q=office");
  });

  it("filtro e página vão na URL; página 1 não", () => {
    expect(searchHref({ query: "a b", media: "series", page: 2 })).toBe(
      "/buscar?q=a+b&midia=series&pagina=2",
    );
    expect(searchHref({ query: "x", media: "filmes", page: 1 })).toBe(
      "/buscar?q=x&midia=filmes",
    );
  });

  it("aba Pessoas não leva o filtro", () => {
    expect(searchHref({ query: "ana", people: true, media: "series" })).toBe(
      "/buscar?q=ana&tipo=pessoas",
    );
  });
});

describe("nextSearchHref", () => {
  const params = (query: string) => new URLSearchParams(query);

  it("em /buscar mantém o filtro de tipo", () => {
    expect(nextSearchHref("lost", "/buscar", params("q=x&midia=series"))).toBe(
      "/buscar?q=lost&midia=series",
    );
  });

  it("em /buscar mantém a aba Pessoas e descarta o filtro", () => {
    expect(
      nextSearchHref("ana", "/buscar", params("q=x&tipo=pessoas&midia=series")),
    ).toBe("/buscar?q=ana&tipo=pessoas");
  });

  it("fora de /buscar começa limpa", () => {
    expect(nextSearchHref("lost", "/descobrir", params("midia=series"))).toBe(
      "/buscar?q=lost",
    );
  });
});
