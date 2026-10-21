import { getTranslations } from "next-intl/server";
import { PosterCard } from "@/components/catalog/poster-card";
import { Progress } from "@/components/ui/progress";
import type { LibraryItem } from "@/domain/library/ports";

// Cartão de um título da biblioteca, usado na Biblioteca e na prévia do Perfil.
// Em listas que misturam situações, `showStatus` mostra a situação da série e
// `showSeen` mostra "Visto" ou "Não visto" no filme; numa sub-lista o nome dela
// já diz isso.
export async function LibraryCard({
  item,
  showStatus = false,
  showSeen = false,
}: {
  item: LibraryItem;
  showStatus?: boolean;
  showSeen?: boolean;
}) {
  const t = await getTranslations();
  const { progress } = item;
  return (
    <PosterCard
      href={`/titulo/${item.titleId}`}
      posterPath={item.posterPath}
      posterAlt={t("Title.poster", { title: item.title })}
      title={item.title}
    >
      {progress && progress.released > 0 ? (
        <Progress
          value={progress.watched}
          max={progress.released}
          aria-label={t("LibraryPage.progressLabel", { title: item.title })}
        />
      ) : null}
      <LibraryCaption item={item} showStatus={showStatus} showSeen={showSeen} />
    </PosterCard>
  );
}

// Linha de apoio do cartão: progresso nas séries e, quando a lista mistura
// situações, a situação do título.
async function LibraryCaption({
  item,
  showStatus,
  showSeen,
}: {
  item: LibraryItem;
  showStatus: boolean;
  showSeen: boolean;
}) {
  const t = await getTranslations("LibraryPage");
  const { progress } = item;
  const parts: string[] = [];
  if (progress) {
    parts.push(
      progress.released > 0
        ? t("progress", {
            watched: progress.watched,
            released: progress.released,
          })
        : t("noEpisodes"),
    );
  }
  if (showStatus && item.mediaType === "tv")
    parts.push(t(`status.${item.status}`));
  if (showSeen && item.mediaType === "movie") {
    parts.push(item.status === "watched" ? t("seen") : t("notSeen"));
  }
  if (parts.length === 0) return null;
  return (
    <span className="text-xs text-muted-foreground">{parts.join(" · ")}</span>
  );
}
