import { describe, expect, it } from "vitest";
import { suggestTitles } from "./suggest-titles";
import { fakeDeps, searchPage } from "./test-fakes";

describe("suggestTitles", () => {
  it("recusa menos de 2 letras sem chamar o provedor", async () => {
    const { deps, provider } = fakeDeps();
    for (const query of ["", " a ", "x"]) {
      expect(await suggestTitles(deps, { query })).toMatchObject({
        ok: false,
        error: { code: "INVALID_INPUT" },
      });
    }
    expect(provider.search).not.toHaveBeenCalled();
  });

  it("devolve só o que a lista mostra", async () => {
    const { deps } = fakeDeps();
    expect(await suggestTitles(deps, { query: "guerra" })).toEqual({
      ok: true,
      value: [
        {
          mediaType: "tv",
          externalId: "1399",
          title: "A Guerra dos Tronos",
          year: "2011",
          posterPath: null,
        },
      ],
    });
  });

  it("limita a 5 sugestões", async () => {
    const [first] = searchPage().items;
    const { deps } = fakeDeps({
      provider: {
        search: async () => ({
          page: 1,
          totalPages: 1,
          totalResults: 8,
          items: Array.from({ length: 8 }, (_, i) => ({
            ...first,
            ref: { mediaType: "movie" as const, externalId: String(i) },
          })),
        }),
      },
    });
    const result = await suggestTitles(deps, { query: "oito" });
    expect(result.ok && result.value).toHaveLength(5);
  });
});
