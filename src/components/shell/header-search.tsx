import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/app/_auth/session";
import { getQuickAddLabels } from "@/components/catalog/quick-add-labels";
import { getSearchPeopleLabels } from "@/components/catalog/search-people-labels";
import { HeaderSearchField } from "./header-search-field";

// Campo do cabeçalho do desktop: sugestões enquanto digita e, ao enviar,
// /buscar (funciona sem JavaScript). No celular a busca fica na própria tela.
export async function HeaderSearch() {
  const t = await getTranslations();
  // A seção Usuários só existe para quem entrou na conta.
  const signedIn = Boolean(await getCurrentUser());
  return (
    <form
      action="/buscar"
      role="search"
      className="relative hidden w-64 md:flex"
    >
      <HeaderSearchField
        ariaLabel={t("Search.headerLabel")}
        peopleLabels={signedIn ? await getSearchPeopleLabels() : undefined}
        labels={{
          placeholder: t("Search.headerPlaceholder"),
          clear: t("Search.clear"),
          suggestions: t("Search.suggestions"),
          titlesHeading: t("Search.kindTitles"),
          seeAllShort: t("Search.seeAllShort"),
          seeAll: t.raw("Search.seeAll"),
          movie: t("MediaType.movie"),
          tv: t("MediaType.tv"),
          quickAdd: await getQuickAddLabels(),
        }}
      />
    </form>
  );
}
