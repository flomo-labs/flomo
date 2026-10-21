import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/app/_auth/session";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import type { LibraryFilter } from "@/contracts/library";
import { SectionHeader } from "@/components/section-header";
import {
  groupLibrary,
  type LibraryGroup,
} from "@/domain/library/library-groups";
import { LibraryCard } from "./library-card";
import { loadLibraryItems } from "./queries";

const GRID = "grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5";

// Grade da Biblioteca para um filtro; usada na abertura da tela e ao trocar de aba.
export async function LibraryList({
  filter,
}: {
  filter: Extract<LibraryFilter, "all" | "hidden">;
}) {
  const t = await getTranslations("LibraryPage");
  const user = await requireUser("/biblioteca");
  const items = await loadLibraryItems(user, filter);

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
        message={filter === "hidden" ? t("emptyHidden") : t("emptyAll")}
        action={
          filter === "all" ? (
            <Button render={<Link href="/descobrir" />} nativeButton={false}>
              {t("search")}
            </Button>
          ) : undefined
        }
      />
    );
  }
  if (filter === "hidden") {
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
  const { series, movies } = groupLibrary(items);
  return (
    <div className="flex flex-col gap-8">
      <LibrarySection title={t("series")} groups={series} kind="tv" />
      <LibrarySection title={t("movies")} groups={movies} kind="movie" />
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
  kind: "tv" | "movie";
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
