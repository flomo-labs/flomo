import { getFormatter, getTranslations } from "next-intl/server";

// Nota do público no TMDB, à parte da nota do Flomo (escalas e votantes
// diferentes: não se misturam). O crédito ao TMDB está no rodapé do site.
export async function TmdbRating({
  rating,
}: {
  rating: { average: number; count: number };
}) {
  const [t, format] = await Promise.all([
    getTranslations("Rating"),
    getFormatter(),
  ]);
  const average = format.number(rating.average, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return (
    <p className="text-sm text-muted-foreground">
      <span aria-hidden="true">{t("tmdb", { average, count: rating.count })}</span>
      <span className="sr-only">
        {t("tmdbAria", { average, count: rating.count })}
      </span>
    </p>
  );
}
