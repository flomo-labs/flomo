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
  card = false,
}: {
  // Na versão `card`, sem notas ainda (`null`) mostra "Sem notas ainda".
  average: Average | null;
  // Versão pequena e cinza, para ficar ao lado de outros metadados.
  compact?: boolean;
  // Cartão em destaque da ficha do título: número grande, estrelas na cor de
  // destaque e a contagem de notas.
  card?: boolean;
}) {
  const t = await getTranslations("Rating");
  if (card) return <AverageCard average={average} t={t} />;
  if (!average) return null;
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
        size={compact ? "sm" : "md"}
        value={average.average}
        labels={await getStarLabels(
          t("averageAria", { average: stars, count: average.count }),
        )}
      />
      <span>{text}</span>
    </p>
  );
}

type Translator = Awaited<ReturnType<typeof getTranslations<"Rating">>>;

// Cartão da média do Flomo na ficha do título. As estrelas leem a média e a
// contagem (`averageAria`); o número e o texto visíveis ficam escondidos do
// leitor de tela para não repetir.
async function AverageCard({
  average,
  t,
}: {
  average: Average | null;
  t: Translator;
}) {
  if (!average) {
    return (
      <div className="flex min-w-0 flex-col justify-center gap-1 rounded-card border border-input bg-muted px-3 py-2">
        <p className="text-sm text-muted-foreground">{t("noRatings")}</p>
        <p className="text-xs text-muted-foreground">{t("flomoLabel")}</p>
      </div>
    );
  }
  const stars = formatAverageStars(average.average);
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-card border border-input bg-muted px-3 py-2">
      <span aria-hidden="true" className="text-3xl leading-none font-bold">
        {stars}
      </span>
      <div className="flex flex-col gap-1">
        <StarRating
          size="md"
          starClassName="text-[oklch(0.656_0.241_354.308)]"
          value={average.average}
          labels={await getStarLabels(
            t("averageAria", { average: stars, count: average.count }),
          )}
        />
        <p aria-hidden="true" className="text-xs text-muted-foreground">
          {t("countInFlomo", { count: average.count })}
        </p>
      </div>
    </div>
  );
}
