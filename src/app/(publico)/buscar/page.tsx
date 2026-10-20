import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DiscoverShelves } from "@/app/_catalog/discover-shelves";
import { searchCatalog } from "@/app/_catalog/gateway";
import { Poster } from "@/components/catalog/poster";
import { Badge } from "@/components/ui/badge";
import { SearchForm } from "@/components/catalog/search-form";
import { Button } from "@/components/ui/button";
import { SEARCH_MAX_PAGE } from "@/contracts/catalog";
import type { SearchItem } from "@/domain/catalog/types";
import { titleRefPath } from "@/lib/title-paths";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Search");
  return { title: `${t("title")} · Flomo`, description: t("description") };
}

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default function BuscarPage({ searchParams }: PageProps<"/buscar">) {
  return (
    <>
      <SearchHeading />
      <Suspense fallback={<p className="text-muted-foreground">…</p>}>
        <SearchBody searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SearchHeading() {
  const t = await getTranslations("Search");
  return <h1 className="text-page-title">{t("title")}</h1>;
}

async function SearchBody({
  searchParams,
}: {
  searchParams: PageProps<"/buscar">["searchParams"];
}) {
  const params = await searchParams;
  const query = firstValue(params.q).trim();
  // Página fora do intervalo vira a mais próxima (o TMDB só vai até a 500).
  const requested = Math.trunc(Number(firstValue(params.pagina))) || 1;
  const page = Math.min(Math.max(requested, 1), SEARCH_MAX_PAGE);

  return (
    <>
      <SearchForm query={query} />
      {query ? <Results query={query} page={page} /> : <DiscoverShelves />}
    </>
  );
}

async function Results({ query, page }: { query: string; page: number }) {
  const t = await getTranslations("Search");
  const result = await searchCatalog({ query, page });

  if (!result.ok) {
    return (
      <p role="alert" className="text-destructive">
        {result.error.message}
      </p>
    );
  }
  const { items, totalPages, totalResults } = result.value;
  if (items.length === 0) {
    return <p className="text-muted-foreground">{t("empty", { query })}</p>;
  }

  return (
    <section aria-label={t("title")} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {t("results", { count: totalResults, query })}
      </p>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={`${item.ref.mediaType}-${item.ref.externalId}`}>
            <ResultCard item={item} />
          </li>
        ))}
      </ul>
      <Pagination
        query={query}
        page={result.value.page}
        totalPages={totalPages}
      />
    </section>
  );
}

async function ResultCard({ item }: { item: SearchItem }) {
  const t = await getTranslations();
  const year = item.releaseDate?.slice(0, 4);
  return (
    <Link
      href={titleRefPath(item.ref)}
      className="flex gap-4 rounded-card border border-border p-3 transition-colors hover:bg-muted/50"
    >
      <Poster
        path={item.posterPath}
        size="w185"
        alt={t("Title.poster", { title: item.title })}
        className="w-20 shrink-0 sm:w-24"
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className="font-semibold">{item.title}</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">
            {t(`MediaType.${item.ref.mediaType}`)}
          </Badge>
          <span>{year ?? t("Search.unknownYear")}</span>
          {item.originalTitle !== item.title ? (
            <span className="italic">{item.originalTitle}</span>
          ) : null}
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {item.overview ?? t("Search.noOverview")}
        </p>
      </div>
    </Link>
  );
}

async function Pagination({
  query,
  page,
  totalPages,
}: {
  query: string;
  page: number;
  totalPages: number;
}) {
  const t = await getTranslations("Search");
  const lastPage = Math.min(totalPages, SEARCH_MAX_PAGE);
  if (lastPage <= 1) return null;
  const href = (target: number) =>
    `/buscar?${new URLSearchParams({ q: query, pagina: String(target) })}`;
  return (
    <nav
      aria-label={t("pagination")}
      className="flex items-center justify-between gap-3"
    >
      {page > 1 ? (
        <Button
          variant="outline"
          render={<Link href={href(page - 1)} />}
          nativeButton={false}
        >
          {t("previous")}
        </Button>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted-foreground">
        {t("page", { page, total: lastPage })}
      </span>
      {page < lastPage ? (
        <Button
          variant="outline"
          render={<Link href={href(page + 1)} />}
          nativeButton={false}
        >
          {t("next")}
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
