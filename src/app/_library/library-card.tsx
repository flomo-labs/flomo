import { getTranslations } from "next-intl/server";
import { PosterCard } from "@/components/catalog/poster-card";
import { Progress } from "@/components/ui/progress";
import type { LibraryItem } from "@/domain/library/ports";

// Cartão de um título da biblioteca, usado na Biblioteca e na prévia do Perfil.
// `showStatus` mostra a situação (nas abas que misturam situações).
export async function LibraryCard({
  item,
  showStatus = false,
}: {
  item: LibraryItem;
  showStatus?: boolean;
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
      <span className="text-xs text-muted-foreground">
        {progress
          ? progress.released > 0
            ? t("LibraryPage.progress", {
                watched: progress.watched,
                released: progress.released,
              })
            : t("LibraryPage.noEpisodes")
          : null}
        {showStatus ? (
          <>
            {progress ? " · " : null}
            {t(`LibraryPage.status.${item.status}`)}
          </>
        ) : null}
      </span>
    </PosterCard>
  );
}
