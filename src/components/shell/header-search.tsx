import { getTranslations } from "next-intl/server";
import { SearchCombobox } from "@/components/catalog/search-combobox";

// Campo do cabeçalho do desktop: sugestões enquanto digita e, ao enviar,
// /buscar (funciona sem JavaScript).
export async function HeaderSearch() {
  const t = await getTranslations();
  return (
    <form
      action="/buscar"
      role="search"
      className="relative hidden w-64 md:flex"
    >
      <SearchCombobox
        withIcon
        ariaLabel={t("Search.headerLabel")}
        className="h-9 rounded-full pl-9"
        listClassName="right-0 left-auto w-[22rem]"
        labels={{
          placeholder: t("Search.headerPlaceholder"),
          suggestions: t("Search.suggestions"),
          seeAll: t.raw("Search.seeAll"),
          movie: t("MediaType.movie"),
          tv: t("MediaType.tv"),
        }}
      />
    </form>
  );
}
