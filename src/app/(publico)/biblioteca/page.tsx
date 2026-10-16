import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Poster } from "@/components/catalog/poster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LIBRARY_FILTERS, type LibraryFilter } from "@/contracts/library";
import { listLibrary } from "@/domain/library/list-library";
import type { LibraryItem } from "@/domain/library/ports";
import { withUser } from "@/infra/db/client";
import { createLibraryRepository } from "@/infra/db/library-repository";
import { requireUser } from "@/app/_auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("LibraryPage");
  return { title: `${t("title")} · Flomo`, description: t("description") };
}

// Filtro na URL, em português: /biblioteca?situacao=assistindo.
const FILTER_PARAM: Record<LibraryFilter, string | null> = {
  all: null,
  watching: "assistindo",
  watchlist: "quero-ver",
  paused: "pausado",
};

function filterFromParam(value: string | string[] | undefined): LibraryFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return LIBRARY_FILTERS.find((f) => FILTER_PARAM[f] === raw) ?? "all";
}

function filterHref(filter: LibraryFilter): string {
  const param = FILTER_PARAM[filter];
  return param ? `/biblioteca?situacao=${param}` : "/biblioteca";
}

export default function BibliotecaPage({
  searchParams,
}: PageProps<"/biblioteca">) {
  return (
    <>
      <Heading />
      <Suspense fallback={<p className="text-muted-foreground">…</p>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Heading() {
  const t = await getTranslations("LibraryPage");
  return <h1 className="text-3xl font-bold">{t("title")}</h1>;
}

async function Body({
  searchParams,
}: {
  searchParams: PageProps<"/biblioteca">["searchParams"];
}) {
  const t = await getTranslations("LibraryPage");
  const user = await requireUser("/biblioteca");
  const filter = filterFromParam((await searchParams).situacao);

  let items: LibraryItem[] | null = null;
  try {
    const result = await withUser(user.claims, (tx) =>
      listLibrary(
        { library: createLibraryRepository(tx), now: () => new Date() },
        { id: user.id },
        { filter },
      ),
    );
    if (result.ok) items = result.value;
  } catch (error) {
    console.error("Falha ao listar a biblioteca:", error);
  }

  return (
    <>
      <Tabs value={filter}>
        <TabsList aria-label={t("filters")}>
          {LIBRARY_FILTERS.map((f) => (
            <TabsTrigger
              key={f}
              value={f}
              render={<Link href={filterHref(f)} />}
              nativeButton={false}
            >
              {t(`filter.${f}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {items === null ? (
        <p role="alert" className="text-destructive">
          {t("unavailable")}
        </p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">
            {filter === "all" ? t("emptyAll") : t("emptyFilter")}
          </p>
          {filter === "all" ? (
            <Button render={<Link href="/buscar" />} nativeButton={false}>
              {t("search")}
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.titleId}>
              <Row item={item} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function Row({ item }: { item: LibraryItem }) {
  const t = await getTranslations();
  const { progress } = item;
  return (
    <Link
      href={`/titulo/${item.titleId}`}
      className="flex gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
    >
      <Poster
        path={item.posterPath}
        size="w185"
        alt={t("Title.poster", { title: item.title })}
        className="w-16 shrink-0 sm:w-20"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="font-semibold">{item.title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{t(`MediaType.${item.mediaType}`)}</Badge>
          <Badge variant="outline">
            {t(`LibraryPage.status.${item.status}`)}
          </Badge>
        </div>
        {progress ? (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">
              {progress.released > 0
                ? t("LibraryPage.progress", {
                    watched: progress.watched,
                    released: progress.released,
                  })
                : t("LibraryPage.noEpisodes")}
            </p>
            {progress.released > 0 ? (
              <Progress
                value={progress.watched}
                max={progress.released}
                aria-label={t("LibraryPage.progressLabel", {
                  title: item.title,
                })}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
