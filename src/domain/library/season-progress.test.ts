import { describe, expect, it } from "vitest";
import { computeSeasonProgress } from "./season-progress";

const ep = (id: string, airDate: string | null = "2020-01-01") => ({
  id,
  airDate,
});

describe("computeSeasonProgress", () => {
  const seasons = [
    { seasonNumber: 1, episodes: [ep("a"), ep("b")] },
    {
      seasonNumber: 2,
      episodes: [ep("c"), ep("d", null), ep("e", "2099-01-01")],
    },
  ];

  it("conta vistos, faltantes lançados e ignora o que ainda não saiu", () => {
    const [s1, s2] = computeSeasonProgress(
      seasons,
      new Set(["a", "c"]),
      "2026-01-01",
    );
    expect(s1).toMatchObject({
      watched: 1,
      total: 2,
      missing: 1,
      watchedReleased: 1,
    });
    expect(s2).toMatchObject({
      watched: 1,
      total: 3,
      missing: 1,
      watchedReleased: 1,
    });
    expect(s2?.watchedIds).toEqual(["c"]);
  });

  it("soma de 1 até a temporada para 'marcar até esta'", () => {
    const [s1, s2] = computeSeasonProgress(
      seasons,
      new Set(["a"]),
      "2026-01-01",
    );
    expect(s1).toMatchObject({ missingThrough: 1, watchedReleasedThrough: 1 });
    expect(s2).toMatchObject({ missingThrough: 3, watchedReleasedThrough: 1 });
  });

  it("episódio visto ainda não lançado conta em vistos, não em lançados", () => {
    const [, s2] = computeSeasonProgress(seasons, new Set(["e"]), "2026-01-01");
    expect(s2).toMatchObject({ watched: 1, missing: 2, watchedReleased: 0 });
  });
});
