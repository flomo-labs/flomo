import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import type { SeasonProgress } from "@/domain/library/season-progress";
import { SeasonWatchControl } from "./season-watch-control";

// Ações do cabeçalho da temporada na sanfona (regular, não os especiais): o
// botão de marcá-la inteira e o menu. O progresso já vem calculado pela tela;
// sem login, o botão leva a entrar, como os outros de marcar; sem estado do
// usuário (`progress` nulo) não aparece nada.
export async function SeasonWatchSlot({
  titleId,
  seasonNumber,
  progress,
  anonymous,
  hasAirDate,
  today,
  loginHref,
}: {
  titleId: string;
  seasonNumber: number;
  progress: SeasonProgress | null;
  anonymous: boolean;
  // O catálogo traz a data de exibição de algum episódio (oferece essa opção).
  hasAirDate: boolean;
  today: string;
  loginHref: string;
}) {
  const t = await getTranslations("Library");

  if (anonymous) {
    return (
      <Button
        variant="outline"
        render={<Link href={loginHref} />}
        nativeButton={false}
        aria-label={t("markSeason")}
        className="h-auto min-h-8 shrink-0 rounded-full py-1.5 whitespace-normal pointer-coarse:min-h-11"
      >
        <Icon name="checkmarkDone" />
        {t("markSeasonShort")}
      </Button>
    );
  }
  // Sem nenhum lançado não há o que marcar: sem botão.
  if (!progress || progress.missing + progress.watchedReleased === 0) {
    return null;
  }

  const { missing, watchedReleased, missingThrough, watchedReleasedThrough } =
    progress;
  const dateLabels = {
    cancel: t("cancel"),
    back: t("back"),
    done: t("done"),
    yesterday: t("yesterday"),
    weekAgo: t("weekAgo"),
    thisYear: t("thisYear"),
    beforeRelease: t("beforeRelease"),
    today: t("seasonToday"),
    noDate: t("seasonNoDate"),
    pickDate: t("seasonPickDate"),
    airDate: hasAirDate ? t("seasonAirDate") : undefined,
  };

  return (
    <SeasonWatchControl
      titleId={titleId}
      seasonNumber={seasonNumber}
      missing={missing}
      missingThrough={missingThrough}
      watchedIds={progress.watchedIds}
      today={today}
      labels={{
        markSeason: t("markSeasonShort"),
        markSeasonFull: t("markSeason"),
        seasonWatched: t("seasonWatched"),
        seasonWatchedUndo: t("seasonWatchedUndo"),
        menu: t("seasonMenu", { number: seasonNumber }),
        menuOnly: t("seasonMenuOnly"),
        menuThrough: t("seasonMenuThrough", { number: seasonNumber }),
        menuUndo: t("seasonMenuUndo"),
        markedOne: t("seasonMarkedOne", { number: seasonNumber }),
        // O número real só se sabe depois de marcar: a tela troca "{count}".
        markedMany: t("seasonMarkedMany", {
          number: seasonNumber,
          count: "{count}",
        }),
        markedThrough: t("seasonMarkedThrough", {
          number: seasonNumber,
          count: "{count}",
        }),
        undone: t("seasonUndone", { number: seasonNumber }),
        undo: t("undo"),
        failed: t("failed"),
        unmarkDialog: {
          title: t("seasonUnmarkTitle", { number: seasonNumber }),
          description: t("seasonUnmarkDescription", {
            count: progress.watched,
          }),
          confirm: t("seasonUnmarkConfirm"),
          cancel: t("cancel"),
        },
        dialog: {
          ...dateLabels,
          title: t("seasonDialogTitle", { number: seasonNumber }),
          description: t("seasonDialogDescription", {
            missing,
            already: watchedReleased,
          }),
        },
        dialogThrough: {
          ...dateLabels,
          title: t("seasonDialogThroughTitle", { number: seasonNumber }),
          description: t("seasonDialogDescription", {
            missing: missingThrough,
            already: watchedReleasedThrough,
          }),
        },
      }}
    />
  );
}
