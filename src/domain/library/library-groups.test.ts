import { describe, expect, it } from "vitest";
import { groupLibrary } from "./library-groups";
import type { LibraryItem } from "./ports";
import type { LibraryStatus } from "./values";

function item(
  titleId: string,
  mediaType: "tv" | "movie",
  status: LibraryStatus,
): LibraryItem {
  return {
    titleId,
    mediaType,
    status,
    title: titleId,
    posterPath: null,
    progress: null,
  };
}

describe("groupLibrary", () => {
  it("separa séries e filmes e agrupa por situação na ordem das sub-listas", () => {
    const { series, movies } = groupLibrary([
      item("s1", "tv", "watched"),
      item("s2", "tv", "watching"),
      item("s3", "tv", "watchlist"),
      item("m1", "movie", "watched"),
      item("m2", "movie", "watchlist"),
      item("s4", "tv", "watching"),
    ]);
    expect(series.map((g) => g.status)).toEqual([
      "watching",
      "watchlist",
      "watched",
    ]);
    expect(series[0].items.map((i) => i.titleId)).toEqual(["s2", "s4"]);
    expect(
      movies.map((g) => [g.status, g.items.map((i) => i.titleId)]),
    ).toEqual([
      ["watchlist", ["m2"]],
      ["watched", ["m1"]],
    ]);
  });

  it("omite sub-listas vazias e devolve vazio sem itens", () => {
    expect(groupLibrary([])).toEqual({ series: [], movies: [] });
  });
});
