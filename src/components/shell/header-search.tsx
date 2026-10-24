import { getTranslations } from "next-intl/server";
import { HeaderSearchField } from "./header-search-field";

// Campo do cabeçalho do desktop: sugestões enquanto digita e, ao enviar,
// /buscar (funciona sem JavaScript). No celular a busca fica na própria tela.
export async function HeaderSearch() {
  const t = await getTranslations();
  return (
    <form
      action="/buscar"
      role="search"
      className="relative hidden w-64 md:flex"
    >
      <HeaderSearchField
        ariaLabel={t("Search.headerLabel")}
        labels={{
          placeholder: t("Search.headerPlaceholder"),
          clear: t("Search.clear"),
          suggestions: t("Search.suggestions"),
          seeAll: t.raw("Search.seeAll"),
          movie: t("MediaType.movie"),
          tv: t("MediaType.tv"),
        }}
      />
    </form>
  );
}
