import { getTranslations } from "next-intl/server";
import type { SearchRecentLabels } from "./search-combobox";

// Textos das buscas recentes (#414) do campo de busca, para visitante e para
// quem entrou na conta.
export async function getSearchRecentLabels(): Promise<SearchRecentLabels> {
  const t = await getTranslations("Search");
  return {
    heading: t("recentHeading"),
    clear: t("recentClear"),
    clearAria: t("recentClearAria"),
    remove: t.raw("recentRemove"),
  };
}
