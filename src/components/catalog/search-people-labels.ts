import { getTranslations } from "next-intl/server";
import { PEOPLE_SEARCH_MIN_LENGTH } from "@/contracts/people-search";
import type { SearchPeopleLabels } from "./search-combobox";

// Textos do filtro Séries e filmes / Usuários do menu de sugestões da busca.
// Só quem entrou na conta recebe: para visitante o menu fica como antes, sem o
// filtro.
export async function getSearchPeopleLabels(): Promise<SearchPeopleLabels> {
  const t = await getTranslations("Search");
  return {
    kindLabel: t("kindLabel"),
    kindTitles: t("kindTitles"),
    kindPeople: t("kindPeople"),
    suggestions: t("peopleSuggestions"),
    seeAll: t.raw("seeAllPeople"),
    tooShort: t("suggestionsTooShort", { min: PEOPLE_SEARCH_MIN_LENGTH }),
    emptyPeople: t.raw("suggestionsEmptyPeople"),
    emptyTitles: t.raw("suggestionsEmptyTitles"),
    failed: t("suggestionsFailed"),
  };
}
