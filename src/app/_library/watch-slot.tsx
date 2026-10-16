import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { todayIn } from "@/domain/library/watch-date";
import { CATALOG_COUNTRY } from "@/domain/catalog/types";
import { watchDateLabel } from "@/lib/watch-date-label";
import { getLibraryState, getUnwatchedEpisodes } from "./state";
import { WatchControl } from "./watch-control";

// Botão de marcar de um episódio ou do filme, na página do título. Lê o
// estado do usuário na requisição; sem login, convida a entrar.
export async function WatchSlot({
  kind,
  titleId,
  episodeId,
  position,
  loginHref,
}: {
  kind: "episode" | "movie";
  titleId: string;
  episodeId?: string;
  // Posição do episódio, para contar os anteriores não vistos.
  position?: { seasonNumber: number; episodeNumber: number };
  loginHref: string;
}) {
  const t = await getTranslations("Library");
  const view = await getLibraryState(titleId);

  if (view.kind === "anonymous") {
    return (
      <Link href={loginHref} className="text-sm text-primary hover:underline">
        {t("signIn")}
      </Link>
    );
  }
  if (view.kind === "unavailable") {
    return <p className="text-sm text-muted-foreground">{t("unavailable")}</p>;
  }

  const item = view.state.watched.find(
    (w) => w.episodeId === (kind === "movie" ? null : episodeId),
  );
  // Só pergunta sobre os anteriores num episódio ainda não visto de série.
  let previousUnwatched = 0;
  if (kind === "episode" && position && !item) {
    const unwatched = (await getUnwatchedEpisodes(titleId)) ?? [];
    previousUnwatched = unwatched.filter(
      (e) =>
        position.seasonNumber > 0 &&
        (e.seasonNumber < position.seasonNumber ||
          (e.seasonNumber === position.seasonNumber &&
            e.episodeNumber < position.episodeNumber)),
    ).length;
  }
  return (
    <WatchControl
      previousUnwatched={previousUnwatched}
      kind={kind}
      targetId={kind === "movie" ? titleId : (episodeId ?? "")}
      watched={
        item
          ? {
              eventId: item.eventId,
              dateLabel: watchDateLabel(item.watchedAt, item.precision),
              records: item.records.map((r) => ({
                eventId: r.eventId,
                dateLabel: watchDateLabel(r.watchedAt, r.precision),
              })),
            }
          : undefined
      }
      today={todayIn(CATALOG_COUNTRY, new Date())}
      labels={{
        markWatched: t("markWatched"),
        markOnlyThis: t("markOnlyThis"),
        markWithPrevious: (count) => t("markWithPrevious", { count }),
        previousTitle: t("previousTitle"),
        previousDescription: (count) => t("previousDescription", { count }),
        cancel: t("cancel"),
        watchAgain: t("watchAgain"),
        history: t("history"),
        deleteRecord: t("deleteRecord"),
        deleteRecordConfirm: t("deleteRecordConfirm"),
        watched: t("watched"),
        unmark: t("unmark"),
        unmarkConfirm: t("unmarkConfirm"),
        changeDate: t("changeDate"),
        today: t("today"),
        noDate: t("noDate"),
        pickDate: t("pickDate"),
        saveDate: t("saveDate"),
        failed: t("failed"),
      }}
    />
  );
}
