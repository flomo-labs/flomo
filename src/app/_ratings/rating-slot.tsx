import { getTranslations } from "next-intl/server";
import { formatStars } from "@/domain/rating/format";
import { getLibraryState } from "../_library/state";
import { getStarLabels } from "@/components/star-labels";
import { RatingControl } from "./rating-control";
import { getUserRatings } from "./state";

// Nota do usuário num filme ou episódio, na página do título. Só aparece para
// quem entrou e já assistiu o item (ou ainda tem nota dele, para poder
// removê-la); o convite para entrar fica no botão de marcar.
export async function RatingSlot({
  titleId,
  episodeId,
  showLabel = false,
}: {
  titleId: string;
  // Ausente = nota do filme.
  episodeId?: string;
  // Escreve "Sua nota" acima das estrelas (ficha do título).
  showLabel?: boolean;
}) {
  const view = await getLibraryState(titleId);
  if (view.kind !== "ok") return null;
  const watched = view.state.watched.some(
    (w) => w.episodeId === (episodeId ?? null),
  );
  const ratings = await getUserRatings(titleId);
  if (!ratings) return null;
  const mine = ratings.find((r) => r.episodeId === (episodeId ?? null));
  if (!watched && !mine) return null;

  const t = await getTranslations("Rating");
  const control = (
    <RatingControl
      target={episodeId ? { episodeId } : { titleId }}
      value={mine?.halfStars ?? null}
      canRate={watched}
      labels={{
        stars: await getStarLabels(
          mine
            ? t("option", { stars: formatStars(mine.halfStars) })
            : undefined,
        ),
        remove: t("remove"),
        done: t("done"),
        cancel: t("cancel"),
        failed: t("failed"),
      }}
    />
  );
  if (!showLabel) return control;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-sm font-medium">{t("group")}</p>
      {control}
    </div>
  );
}
