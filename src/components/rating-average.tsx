import { getTranslations } from "next-intl/server";
import { getStarLabels } from "./star-labels";
import { StarRating } from "./star-rating";
import { formatAverageStars } from "@/domain/rating/format";
import type { RatingAverage as Average } from "@/domain/rating/summary";

// Média das notas de todos os usuários (de filme, temporada ou série), só o
// agregado: nunca a nota de alguém.
export async function RatingAverage({
  average,
  compact = false,
}: {
  average: Average;
  // Versão pequena e cinza, para ficar ao lado de outros metadados.
  compact?: boolean;
}) {
  const t = await getTranslations("Rating");
  const stars = formatAverageStars(average.average);
  const text = t("average", { average: stars, count: average.count });
  return (
    <p
      className={
        compact
          ? "flex items-center gap-1.5 text-xs text-muted-foreground"
          : "flex items-center gap-2 text-sm text-muted-foreground"
      }
    >
      <StarRating
        compact={compact}
        value={average.average}
        labels={await getStarLabels(
          t("averageAria", { average: stars, count: average.count }),
        )}
      />
      <span>{text}</span>
    </p>
  );
}
