import { describe, expect, it } from "vitest";
import { libraryPreview } from "./library-preview";
import type { LibraryItem } from "./ports";

function item(titleId: string, mediaType: "tv" | "movie"): LibraryItem {
  return {
    titleId,
    mediaType,
    status: "watching",
    title: titleId,
    posterPath: null,
    progress: null,
  };
}

describe("libraryPreview", () => {
  it("separa séries e filmes mantendo a ordem", () => {
    const result = libraryPreview([
      item("a", "tv"),
      item("b", "movie"),
      item("c", "tv"),
    ]);
    expect(result.series.map((i) => i.titleId)).toEqual(["a", "c"]);
    expect(result.movies.map((i) => i.titleId)).toEqual(["b"]);
  });

  it("limita cada tipo ao tamanho da prévia", () => {
    const items = Array.from({ length: 10 }, (_, i) => item(`s${i}`, "tv"));
    expect(libraryPreview(items, 3).series).toHaveLength(3);
  });

  it("devolve listas vazias sem itens", () => {
    expect(libraryPreview([])).toEqual({ series: [], movies: [] });
  });
});
