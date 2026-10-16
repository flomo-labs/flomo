import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEARCH_QUERY_MAX_LENGTH } from "@/contracts/catalog";

// Formulário de busca (GET /buscar?q=). Funciona sem JavaScript.
export async function SearchForm({ query = "" }: { query?: string }) {
  const t = await getTranslations("Search");
  return (
    <form
      action="/buscar"
      method="get"
      role="search"
      className="flex flex-col gap-2"
    >
      <Label htmlFor="q">{t("label")}</Label>
      <div className="flex gap-2">
        <Input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder={t("placeholder")}
          maxLength={SEARCH_QUERY_MAX_LENGTH}
          autoComplete="off"
          required
        />
        <Button type="submit">{t("submit")}</Button>
      </div>
    </form>
  );
}
