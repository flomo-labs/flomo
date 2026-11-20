import { getTranslations } from "next-intl/server";
import { PEOPLE_SEARCH_MIN_LENGTH } from "@/contracts/people-search";
import type { SearchPeopleLabels } from "./search-combobox";

// Textos da seção Usuários do menu de sugestões da busca. Só quem entrou na
// conta recebe: para visitante o menu mostra só a seção de títulos.
export async function getSearchPeopleLabels(): Promise<SearchPeopleLabels> {
  const t = await getTranslations("Search");
  return {
    heading: t("kindPeople"),
    suggestions: t("peopleSuggestions"),
    seeAll: t.raw("seeAllPeople"),
    tooShort: t("suggestionsTooShort", { min: PEOPLE_SEARCH_MIN_LENGTH }),
    emptyPeople: t.raw("suggestionsEmptyPeople"),
    emptyTitles: t.raw("suggestionsEmptyTitles"),
    failed: t("suggestionsFailed"),
  };
}
