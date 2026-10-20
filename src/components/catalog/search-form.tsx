import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchCombobox } from "@/components/catalog/search-combobox";

// Formulário de busca (GET /buscar?q=). Funciona sem JavaScript.
export async function SearchForm({ query = "" }: { query?: string }) {
  const t = await getTranslations("Search");
  const tm = await getTranslations("MediaType");
  return (
    <form
      action="/buscar"
      method="get"
      role="search"
      className="flex flex-col gap-2"
    >
      <Label htmlFor="q">{t("label")}</Label>
      <div className="flex gap-2">
        <SearchCombobox
          id="q"
          defaultValue={query}
          required
          labels={{
            placeholder: t("placeholder"),
            suggestions: t("suggestions"),
            seeAll: t.raw("seeAll"),
            movie: tm("movie"),
            tv: tm("tv"),
          }}
        />
        <Button type="submit">{t("submit")}</Button>
      </div>
    </form>
  );
}
