import { getTranslations } from "next-intl/server";
import { formatStars } from "@/domain/rating/format";
import type { StarRatingLabels } from "./star-rating";

// Textos das estrelas: um por meia estrela ("3,5 de 5 estrelas").
export async function getStarLabels(
  readOnly?: string,
): Promise<StarRatingLabels> {
  const t = await getTranslations("Rating");
  return {
    group: t("group"),
    options: Array.from({ length: 10 }, (_, i) =>
      t("option", { stars: formatStars(i + 1) }),
    ),
    readOnly,
  };
}
