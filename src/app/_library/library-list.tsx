import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/app/_auth/session";
import { PosterRow } from "@/components/catalog/poster-row";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { LibraryFilter } from "@/contracts/library";
import { listLibrary } from "@/domain/library/list-library";
import type { LibraryItem } from "@/domain/library/ports";
import { withUser } from "@/infra/db/client";
import { createLibraryRepository } from "@/infra/db/library-repository";

// Lista da Biblioteca para um filtro; usada na abertura da tela e ao trocar de aba.
export async function LibraryList({ filter }: { filter: LibraryFilter }) {
  const t = await getTranslations("LibraryPage");
  const user = await requireUser("/biblioteca");

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

  if (items === null) {
    return (
      <p role="alert" className="text-destructive">
        {t("unavailable")}
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        message={
          filter === "all"
            ? t("emptyAll")
            : filter === "hidden"
              ? t("emptyHidden")
              : t("emptyFilter")
        }
        action={
          filter === "all" ? (
            <Button render={<Link href="/buscar" />} nativeButton={false}>
              {t("search")}
            </Button>
          ) : undefined
        }
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.titleId}>
          <Row item={item} />
        </li>
      ))}
    </ul>
  );
}

async function Row({ item }: { item: LibraryItem }) {
  const t = await getTranslations();
  const { progress } = item;
  return (
    <PosterRow
      href={`/titulo/${item.titleId}`}
      posterPath={item.posterPath}
      posterAlt={t("Title.poster", { title: item.title })}
    >
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
    </PosterRow>
  );
}
