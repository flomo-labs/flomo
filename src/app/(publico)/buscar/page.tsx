import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { searchCatalog } from "@/app/_catalog/gateway";
import { Poster } from "@/components/catalog/poster";
import { Icon } from "@/components/icon";
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

  // Sem termo não há o que mostrar: as listas ficam em Descobrir.
  if (!query) redirect("/descobrir");

  return (
    <>
      <SearchForm query={query} />
      <Results query={query} page={page} />
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
      <ul className="flex max-w-reading flex-col gap-3">
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
  const year = item.releaseDate?.slice(0, 4) ?? t("Search.unknownYear");
  const facts = [t(`MediaType.${item.ref.mediaType}`), year];
  return (
    <Link
      href={titleRefPath(item.ref)}
      className="flex min-h-11 items-center gap-4 rounded-card border border-border p-2.5 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50"
    >
      <Poster
        path={item.posterPath}
        size="w185"
        alt={t("Title.poster", { title: item.title })}
        className="w-14 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="font-semibold break-words">{item.title}</h2>
        <p className="text-sm text-muted-foreground break-words">
          {facts.join(" · ")}
          {item.originalTitle !== item.title ? (
            <span className="italic"> · {item.originalTitle}</span>
          ) : null}
        </p>
        <p className="line-clamp-2 hidden text-sm break-words text-muted-foreground md:block">
          {item.overview ?? t("Search.noOverview")}
        </p>
      </div>
      <Icon
        name="chevronForward"
        className="size-4 shrink-0 text-muted-foreground"
      />
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
