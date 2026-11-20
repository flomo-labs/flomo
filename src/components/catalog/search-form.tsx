import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/app/_auth/session";
import { Suspense } from "react";
import { getQuickAddLabels } from "@/components/catalog/quick-add-labels";
import { getSearchPeopleLabels } from "@/components/catalog/search-people-labels";
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
        <SearchField query={query} people={people} />
      </Suspense>
    </form>
  );
}

// O campo em si, separado para ler a sessão dentro do Suspense: quem entrou na
// conta ganha o filtro Séries e filmes / Usuários no menu de sugestões.
async function SearchField({
  query,
  people,
}: {
  query: string;
  people: boolean;
}) {
  const t = await getTranslations("Search");
  const tm = await getTranslations("MediaType");
  const signedIn = Boolean(await getCurrentUser());
  return (
    <SearchCombobox
      key={people ? "pessoas" : "titulos"}
      id="q"
      defaultValue={query}
      withIcon
      required
      peopleLabels={signedIn ? await getSearchPeopleLabels() : undefined}
      className="h-11 rounded-full pl-9 text-base"
      labels={{
        placeholder: t("placeholder"),
        clear: t("clear"),
        suggestions: t("suggestions"),
        titlesHeading: t("kindTitles"),
        seeAllShort: t("seeAllShort"),
        seeAll: t.raw("seeAll"),
        movie: tm("movie"),
        tv: tm("tv"),
        quickAdd: await getQuickAddLabels(),
      }}
    />
  );
}
