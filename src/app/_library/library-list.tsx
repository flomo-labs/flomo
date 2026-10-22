import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/app/_auth/session";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import {
  groupLibrary,
  type LibraryGroup,
} from "@/domain/library/library-groups";
import type { LibraryItem } from "@/domain/library/ports";
import { LibraryCard } from "./library-card";
import { LibraryFilters } from "./library-filters";
import { LibraryRow } from "./library-row";
import { loadLibraryItems } from "./queries";
import { LIBRARY_VIEWS, type LibraryView } from "./library-view";

const GRID = "grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5";

export type LibraryMedia = "tv" | "movie";

// Biblioteca inteira (ou só séries/filmes, nas telas "Ver tudo" do Perfil) com
// as visões lado a lado. Lê a biblioteca e os ocultos uma vez e monta todas as
// visões a partir deles, para trocar de visão não voltar ao servidor.
export async function LibraryViews({
  path,
  mediaType,
}: {
  path: string;
  mediaType?: LibraryMedia;
}) {
  const t = await getTranslations("LibraryPage");
  const user = await requireUser(path);
  const [all, hidden] = await Promise.all([
    loadLibraryItems(user, "all", mediaType),
    loadLibraryItems(user, "hidden", mediaType),
  ]);
  if (all === null || hidden === null) {
    return (
      <p role="alert" className="text-destructive">
        {t("unavailable")}
      </p>
    );
  }
  const lists = Object.fromEntries(
    LIBRARY_VIEWS.map((view) => [
      view,
      <LibraryItems
        key={view}
        view={view}
        items={view === "hidden" ? hidden : all}
        mediaType={mediaType}
      />,
    ]),
  ) as Record<LibraryView, React.ReactNode>;
  return (
    <LibraryFilters
      views={LIBRARY_VIEWS}
      lists={lists}
      labels={{
        views: t("views"),
        view: {
          grouped: t("view.grouped"),
          posters: t("view.posters"),
          list: t("view.list"),
          hidden: t("view.hidden"),
        },
      }}
    />
  );
}

async function LibraryItems({
  view,
  items,
  mediaType,
}: {
  view: LibraryView;
  items: LibraryItem[];
  mediaType?: LibraryMedia;
}) {
  const t = await getTranslations("LibraryPage");
  if (items.length === 0) {
    return (
      <EmptyState
        message={view === "hidden" ? t("emptyHidden") : t("emptyAll")}
        action={
          view === "hidden" ? undefined : (
            <Button render={<Link href="/descobrir" />} nativeButton={false}>
              {t("search")}
            </Button>
          )
        }
      />
    );
  }
  if (view === "hidden" || view === "posters") {
    return (
      <ul className={GRID}>
        {items.map((item) => (
          <li key={item.titleId}>
            <LibraryCard item={item} showStatus showSeen />
          </li>
        ))}
      </ul>
    );
  }
  if (view === "list") {
    return (
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.titleId}>
            <LibraryRow item={item} />
          </li>
        ))}
      </ul>
    );
  }
  const { series, movies } = groupLibrary(items);
  return (
    <div className="flex flex-col gap-8">
      {mediaType === "movie" ? null : (
        <LibrarySection title={t("series")} groups={series} kind="tv" />
      )}
      {mediaType === "tv" ? null : (
        <LibrarySection title={t("movies")} groups={movies} kind="movie" />
      )}
    </div>
  );
}

// Seção (Séries ou Filmes) com uma sub-lista por situação; some se vazia.
async function LibrarySection({
  title,
  groups,
  kind,
}: {
  title: string;
  groups: LibraryGroup[];
  kind: LibraryMedia;
}) {
  if (groups.length === 0) return null;
  const t = await getTranslations("LibraryPage");
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader title={title} />
      {groups.map(({ status, items }) => (
        <div key={status} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t(
              `group.${status === "watched" && kind === "movie" ? "watchedMovie" : status}`,
            )}
          </h3>
          <ul className={GRID}>
            {items.map((item) => (
              <li key={item.titleId}>
                <LibraryCard item={item} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
