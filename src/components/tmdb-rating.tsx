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
  // Contagem curta ("9,8 mil") para o cartão caber em telas estreitas.
  const votes = format.number(rating.count, { notation: "compact" });
  return (
    <div className="flex min-w-0 flex-col justify-center gap-1 rounded-card border border-input bg-muted px-3 py-2">
      <p aria-hidden="true" className="flex flex-col gap-0.5">
        <span className="text-xl leading-none font-semibold">{average}</span>
        <span className="text-xs text-muted-foreground">
          {t("tmdbCard", { votes })}
        </span>
      </p>
      <p className="sr-only">
        {t("tmdbAria", { average, count: rating.count })}
      </p>
    </div>
  );
}
