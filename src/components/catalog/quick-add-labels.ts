import { getTranslations } from "next-intl/server";
import type { QuickAddLabels } from "./quick-add-button";

// Textos do atalho de adicionar à biblioteca, para as telas (servidor) que
// montam `QuickAddButton` ou o campo de busca com sugestões.
export async function getQuickAddLabels(): Promise<QuickAddLabels> {
  const t = await getTranslations("QuickAdd");
  return {
    add: t.raw("add"),
    inLibrary: t.raw("inLibrary"),
    addShort: t("addShort"),
    inLibraryShort: t("inLibraryShort"),
    added: t.raw("added"),
    alreadyIn: t.raw("alreadyIn"),
    undo: t("undo"),
    undone: t.raw("undone"),
    failed: t("failed"),
  };
}
