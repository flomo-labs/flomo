import { getTranslations } from "next-intl/server";
import { LIBRARY_STATUSES } from "@/domain/library/values";
import { getLibraryState } from "./state";
import { StatusControl, type StatusControlLabels } from "./status-control";

// Botão de biblioteca na página do título. Sem login não mostra nada: o
// convite para entrar fica no botão de marcar.
export async function StatusSlot({ titleId }: { titleId: string }) {
  const t = await getTranslations("Library");
  const tp = await getTranslations("LibraryPage");
  const view = await getLibraryState(titleId);
  if (view.kind !== "ok") return null;

  const status = Object.fromEntries(
    LIBRARY_STATUSES.map((s) => [s, tp(`status.${s}`)]),
  ) as StatusControlLabels["status"];
  return (
    <StatusControl
      titleId={titleId}
      status={view.state.status ?? undefined}
      hidden={view.state.hidden}
      labels={{
        add: t("addToLibrary"),
        inLibrary: t("inLibrary"),
        dialogTitle: t("libraryDialogTitle"),
        currentStatus: t("currentStatus"),
        hide: t("hide"),
        unhide: t("unhide"),
        watchLater: t("watchLater"),
        stopWatching: t("stopWatching"),
        remove: t("removeFromLibrary"),
        removeHint: t("removeFromLibraryHint"),
        cancel: t("cancel"),
        failed: t("failed"),
        status,
      }}
    />
  );
}
