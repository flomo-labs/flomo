import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { todayIn } from "@/domain/library/watch-date";
import { CATALOG_COUNTRY } from "@/domain/catalog/types";
import { watchDateLabel } from "@/lib/watch-date-label";
import { getLibraryState } from "./state";
import { WatchControl } from "./watch-control";

// Botão de marcar de um episódio ou do filme, na página do título. Lê o
// estado do usuário na requisição; sem login, convida a entrar.
export async function WatchSlot({
  kind,
  titleId,
  episodeId,
  loginHref,
}: {
  kind: "episode" | "movie";
  titleId: string;
  episodeId?: string;
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
  return (
    <WatchControl
      kind={kind}
      targetId={kind === "movie" ? titleId : (episodeId ?? "")}
      watched={
        item
          ? {
              eventId: item.eventId,
              dateLabel: watchDateLabel(item.watchedAt, item.precision),
            }
          : undefined
      }
      today={todayIn(CATALOG_COUNTRY, new Date())}
      labels={{
        markWatched: t("markWatched"),
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
