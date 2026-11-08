import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { CATALOG_COUNTRY } from "@/domain/catalog/types";
import { todayIn } from "@/domain/library/watch-date";
import { getLibraryState } from "./state";
import { SeasonWatchControl } from "./season-watch-control";

// Linha da temporada com o botão de marcá-la inteira (regular, não os
// especiais). Lê o estado do usuário na requisição; sem login, o botão leva
// a entrar, como os outros de marcar.
export async function SeasonWatchSlot({
  titleId,
  seasonNumber,
  episodes,
  summary,
  loginHref,
}: {
  titleId: string;
  seasonNumber: number;
  episodes: { id: string; airDate: string | null }[];
  // "Temporada 1 · 24 episódios", já escrito pela tela.
  summary: string;
  loginHref: string;
}) {
  const t = await getTranslations("Library");
  const view = await getLibraryState(titleId);

  if (view.kind === "anonymous") {
    return (
      <div className="flex max-w-reading flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-sm text-muted-foreground">{summary}</p>
        <Button
          variant="outline"
          render={<Link href={loginHref} />}
          nativeButton={false}
          className="h-auto min-h-8 max-w-full rounded-full py-1.5 whitespace-normal pointer-coarse:min-h-11"
        >
          <Icon name="checkmarkDone" />
          {t("markSeason")}
        </Button>
      </div>
    );
  }
  if (view.kind === "unavailable") {
    return <p className="text-sm text-muted-foreground">{summary}</p>;
  }

  const today = todayIn(CATALOG_COUNTRY, new Date());
  const watchedIds = new Set(
    view.state.watched.flatMap((w) => (w.episodeId ? [w.episodeId] : [])),
  );
  // Mesma regra do caso de uso: só os lançados (ou sem data) entram.
  const released = episodes.filter((e) => !e.airDate || e.airDate <= today);
  const watchedReleased = released.filter((e) => watchedIds.has(e.id)).length;
  const watched = episodes.filter((e) => watchedIds.has(e.id)).length;
  const missing = released.length - watchedReleased;
  // Sem nenhum lançado não há o que marcar: fica só o texto.
  if (released.length === 0) {
    return <p className="text-sm text-muted-foreground">{summary}</p>;
  }

  return (
    <SeasonWatchControl
      titleId={titleId}
      seasonNumber={seasonNumber}
      watched={watched}
      total={episodes.length}
      missing={missing}
      watchedEpisodeIds={episodes
        .filter((e) => watchedIds.has(e.id))
        .map((e) => e.id)}
      today={today}
      labels={{
        summary,
        markSeason: t("markSeason"),
        seasonWatched: t("seasonWatched"),
        seasonWatchedUndo: t("seasonWatchedUndo"),
        progress: t("seasonProgress", {
          watched,
          total: episodes.length,
        }),
        markedOne: t("seasonMarkedOne", { number: seasonNumber }),
        // O número real só se sabe depois de marcar: a tela troca "{count}".
        markedMany: t("seasonMarkedMany", {
          number: seasonNumber,
          count: "{count}",
        }),
        undone: t("seasonUndone", { number: seasonNumber }),
        undo: t("undo"),
        failed: t("failed"),
        unmarkDialog: {
          title: t("seasonUnmarkTitle", { number: seasonNumber }),
          description: t("seasonUnmarkDescription", { count: watched }),
          confirm: t("seasonUnmarkConfirm"),
          cancel: t("cancel"),
        },
        dialog: {
          title: t("seasonDialogTitle", { number: seasonNumber }),
          description: t("seasonDialogDescription", {
            missing,
            already: watchedReleased,
          }),
          cancel: t("cancel"),
          back: t("back"),
          done: t("done"),
          today: t("seasonToday"),
          noDate: t("seasonNoDate"),
          pickDate: t("seasonPickDate"),
          airDate: episodes.some((e) => e.airDate)
            ? t("seasonAirDate")
            : undefined,
        },
      }}
    />
  );
}
