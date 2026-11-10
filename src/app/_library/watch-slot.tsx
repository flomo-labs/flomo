import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { todayIn } from "@/domain/library/watch-date";
import { CATALOG_COUNTRY } from "@/domain/catalog/types";
import { buttonVariants } from "@/components/ui/button";
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
  hasAirDate = false,
  releaseDate,
  loginHref,
}: {
  kind: "episode" | "movie";
  titleId: string;
  episodeId?: string;
  // Posição do episódio, para contar os anteriores não vistos.
  position?: { seasonNumber: number; episodeNumber: number };
  // O catálogo tem a data de exibição do episódio ou de lançamento do filme:
  // só então "No dia em que foi ao ar/do lançamento" aparece ao editar a data.
  hasAirDate?: boolean;
  // AAAA-MM-DD de lançamento (filme) ou exibição (episódio), para avisar de
  // data anterior.
  releaseDate?: string | null;
  loginHref: string;
}) {
  const t = await getTranslations("Library");
  const view = await getLibraryState(titleId);

  if (view.kind === "anonymous") {
    // Episódio: no lugar da frase (que espremia o texto no celular, #310), o
    // mesmo círculo de marcar do logado, sem texto visível, que leva a entrar.
    // `mt-0!` anula o espaçamento que a lista aplica a filhos que não são
    // `button`.
    if (kind === "episode") {
      return (
        <Link
          href={loginHref}
          aria-label={t("signIn")}
          title={t("signIn")}
          className={`${buttonVariants({ variant: "outline" })} col-start-3 row-start-1 row-span-1 mt-0! sm:row-span-3 size-11 self-center rounded-full`}
        />
      );
    }
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
      releaseDate={releaseDate}
      labels={{
        markWatched: t("markWatched"),
        markOnlyThis: t("markOnlyThis"),
        markWithPrevious: t("markWithPrevious", {
          count: previousUnwatched,
        }),
        previousTitle: t("previousTitle"),
        previousDescription: t("previousDescription", {
          count: previousUnwatched,
        }),
        cancel: t("cancel"),
        watchAgain: t("watchAgain"),
        watchedChoice: t("watchedChoice"),
        back: t("back"),
        done: t("done"),
        editRecord: t("editRecord"),
        history: t("history"),
        deleteRecord: t("deleteRecord"),
        deleteRecordConfirm: t("deleteRecordConfirm"),
        watched: t("watched"),
        unmark: t("unmark"),
        unmarkConfirm: t("unmarkConfirm"),
        today: t("today"),
        noDate: t("noDate"),
        pickDate: t("pickDate"),
        yesterday: t("yesterday"),
        weekAgo: t("weekAgo"),
        thisYear: t("thisYear"),
        beforeRelease: t("beforeRelease"),
        dateSaved: t("dateSaved", { date: "{date}" }),
        dateRemoved: t("dateRemoved"),
        airDate: hasAirDate
          ? t(kind === "movie" ? "onReleaseDate" : "onAirDate")
          : undefined,
        failed: t("failed"),
      }}
    />
  );
}
