import { getTranslations } from "next-intl/server";
import { getStarLabels } from "./star-labels";
import { StarRating } from "./star-rating";
import { formatAverageStars } from "@/domain/rating/format";
import type { RatingAverage as Average } from "@/domain/rating/summary";

// Média das notas de todos os usuários (de filme, temporada ou série), só o
// agregado: nunca a nota de alguém.
export async function RatingAverage({ average }: { average: Average }) {
  const t = await getTranslations("Rating");
  const stars = formatAverageStars(average.average);
  const text = t("average", { average: stars, count: average.count });
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <StarRating
        value={average.average}
        labels={await getStarLabels(
          t("averageAria", { average: stars, count: average.count }),
        )}
      />
      <span>{text}</span>
    </p>
  );
}
