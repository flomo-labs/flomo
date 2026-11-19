import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getQuickAddLabels } from "@/components/catalog/quick-add-labels";
import { SearchStateFields } from "@/components/catalog/search-state-fields";
import { SearchCombobox } from "@/components/catalog/search-combobox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { SearchMedia } from "@/lib/search-url";

// Campo de busca da página (GET /buscar?q=), só no celular: no desktop o campo
// do cabeçalho faz esse papel. Funciona sem JavaScript (Enter envia).
export async function SearchForm({
  query = "",
  people = false,
  media = "tudo",
}: {
  query?: string;
  // Aba (Pessoas) e filtro de tipo ativos: uma nova busca os mantém.
  people?: boolean;
  media?: SearchMedia;
}) {
  const t = await getTranslations("Search");
  const tm = await getTranslations("MediaType");
  return (
    <form
      action="/buscar"
      method="get"
      role="search"
      className="flex flex-col gap-2 md:hidden"
    >
      <SearchStateFields people={people} media={media} />
      <Label htmlFor="q" className="sr-only">
        {t("label")}
      </Label>
      {/* O campo lê a URL (useSearchParams): sem Suspense a tela não monta o
          casco estático, e a navegação cairia num esqueleto de página inteira. */}
      <Suspense fallback={<Skeleton className="h-11 rounded-full" />}>
        <SearchCombobox
          id="q"
          defaultValue={query}
          withIcon
          required
          className="h-11 rounded-full pl-9 text-base"
          labels={{
            placeholder: t("placeholder"),
            clear: t("clear"),
            suggestions: t("suggestions"),
            seeAll: t.raw("seeAll"),
            movie: tm("movie"),
            tv: tm("tv"),
            quickAdd: await getQuickAddLabels(),
          }}
        />
      </Suspense>
    </form>
  );
}
