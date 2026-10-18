import { describe, expect, it } from "vitest";
import { summarizeRatings } from "./summary";

describe("summarizeRatings", () => {
  it("sem notas não há média", () => {
    expect(summarizeRatings([])).toEqual({
      overall: null,
      bySeason: {},
      byEpisode: {},
    });
  });

  it("a média da série é a de todas as notas, não a média das temporadas", () => {
    const summary = summarizeRatings([
      { seasonNumber: 1, average: 10, count: 1 },
      { seasonNumber: 2, average: 4, count: 3 },
    ]);
    expect(summary.overall).toEqual({ average: 5.5, count: 4 });
    expect(summary.bySeason[1]).toEqual({ average: 10, count: 1 });
    expect(summary.bySeason[2]).toEqual({ average: 4, count: 3 });
  });

  it("nota de filme entra na média geral e não em temporada", () => {
    const summary = summarizeRatings([
      { seasonNumber: null, average: 7, count: 2 },
    ]);
    expect(summary.overall).toEqual({ average: 7, count: 2 });
    expect(summary.bySeason).toEqual({});
  });

  it("indexa a média de cada episódio pelo id e ignora quantidade zero", () => {
    const summary = summarizeRatings(
      [],
      [
        { episodeId: "e1", average: 7.5, count: 2 },
        { episodeId: "e2", average: 3, count: 0 },
      ],
    );
    expect(summary.byEpisode).toEqual({ e1: { average: 7.5, count: 2 } });
  });
});
