import type { RatingGroup } from "./ports";

export type RatingAverage = {
  // Em meias estrelas (1 a 10), com casas decimais.
  average: number;
  count: number;
};

export type TitleRatingSummary = {
  // Média de todas as notas do título (de série: todos os episódios); nulo
  // sem nenhuma nota.
  overall: RatingAverage | null;
  // Média por número de temporada, só das que têm nota.
  bySeason: Record<number, RatingAverage>;
};

// A média da série é a de todas as notas, não a média das médias das
// temporadas: cada grupo pesa pela quantidade de notas.
export function summarizeRatings(groups: RatingGroup[]): TitleRatingSummary {
  const bySeason: Record<number, RatingAverage> = {};
  let sum = 0;
  let count = 0;
  for (const g of groups) {
    if (g.count <= 0) continue;
    sum += g.average * g.count;
    count += g.count;
    if (g.seasonNumber !== null) {
      bySeason[g.seasonNumber] = { average: g.average, count: g.count };
    }
  }
  return {
    overall: count > 0 ? { average: sum / count, count } : null,
    bySeason,
  };
}
