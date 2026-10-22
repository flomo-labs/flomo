import { getTranslations } from "next-intl/server";
import { SearchCombobox } from "@/components/catalog/search-combobox";
import { Label } from "@/components/ui/label";

// Campo de busca da página (GET /buscar?q=), só no celular: no desktop o campo
// do cabeçalho faz esse papel. Funciona sem JavaScript (Enter envia).
export async function SearchForm({ query = "" }: { query?: string }) {
  const t = await getTranslations("Search");
  const tm = await getTranslations("MediaType");
  return (
    <form
      action="/buscar"
      method="get"
      role="search"
      className="flex flex-col gap-2 md:hidden"
    >
      <Label htmlFor="q" className="sr-only">
        {t("label")}
      </Label>
      <SearchCombobox
        id="q"
        defaultValue={query}
        withIcon
        required
        className="h-11 pl-9 text-base"
        labels={{
          placeholder: t("placeholder"),
          suggestions: t("suggestions"),
          seeAll: t.raw("seeAll"),
          movie: tm("movie"),
          tv: tm("tv"),
        }}
      />
    </form>
  );
}
