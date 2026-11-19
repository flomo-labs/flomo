import { getTranslations } from "next-intl/server";
import { requireUser } from "@/app/_auth/session";
import { followButtonLabels } from "@/app/_follow/labels";
import { EmptyState } from "@/components/empty-state";
import { InfinitePersonList } from "@/components/follow/infinite-person-list";
import {
  normalizePeopleQuery,
  PEOPLE_SEARCH_MIN_LENGTH,
} from "@/contracts/people-search";
import { searchHref } from "@/lib/search-url";
import { loadPeopleSearch } from "./queries";

// Resultados da aba Pessoas da busca (#357): reaproveita a lista de pessoas das
// telas de seguidores (linha, botão de seguir e rolagem infinita). O primeiro
// trecho vem do servidor. Termo curto demais pede mais letras.
export async function PeopleResults({ query }: { query: string }) {
  const user = await requireUser(searchHref({ query, people: true }));
  const t = await getTranslations("PeopleSearch");
  const tf = await getTranslations("seguidores");
  const term = normalizePeopleQuery(query);
  if (term.length < PEOPLE_SEARCH_MIN_LENGTH) {
    return (
      <p className="text-muted-foreground">
        {t("tooShort", { min: PEOPLE_SEARCH_MIN_LENGTH })}
      </p>
    );
  }
  const page = await loadPeopleSearch(user, query, null);
  if (!page.ok) {
    return (
      <p role="alert" className="text-destructive">
        {page.code === "RATE_LIMITED" ? tf("loadMoreRateLimited") : t("failed")}
      </p>
    );
  }
  if (page.items.length === 0) {
    return <EmptyState title={t("empty", { query: term })} />;
  }
  return (
    <section
      aria-label={t("title")}
      className="flex max-w-reading flex-col gap-4"
    >
      <InfinitePersonList
        key={term}
        source={{ type: "search", query }}
        initialItems={page.items}
        initialNextCursor={page.nextCursor}
        labels={{
          followsYou: tf("followsYou"),
          menu: tf("personMenuAria", { name: "{name}" }),
          empty: t("empty", { query: term }),
          loadFailed: tf("loadMoreFailed"),
          rateLimited: tf("loadMoreRateLimited"),
          retry: tf("retry"),
          follow: followButtonLabels(tf),
          remove: null,
        }}
      />
    </section>
  );
}
