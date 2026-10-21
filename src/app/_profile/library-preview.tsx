import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { CurrentUser } from "@/app/_auth/session";
import { LibraryCard } from "@/app/_library/library-card";
import { loadLibraryPreview } from "@/app/_library/queries";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import type { LibraryItem } from "@/domain/library/ports";

// Prévia da biblioteca no perfil do próprio usuário: séries e filmes em seções
// separadas, cada uma com "Ver tudo" para a Biblioteca.
export async function LibraryPreview({ user }: { user: CurrentUser }) {
  const t = await getTranslations("Profile");
  const preview = await loadLibraryPreview(user);
  if (preview === null) {
    return (
      <p role="alert" className="text-destructive">
        {t("libraryUnavailable")}
      </p>
    );
  }
  const { series, movies } = preview;
  if (series.length === 0 && movies.length === 0) {
    return (
      <EmptyState
        message={t("libraryEmpty")}
        action={
          <Button render={<Link href="/descobrir" />} nativeButton={false}>
            {t("search")}
          </Button>
        }
      />
    );
  }
  return (
    <>
      <PreviewSection
        id="perfil-series"
        title={t("seriesSection")}
        items={series}
      />
      <PreviewSection
        id="perfil-filmes"
        title={t("moviesSection")}
        items={movies}
      />
    </>
  );
}

async function PreviewSection({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: LibraryItem[];
}) {
  if (items.length === 0) return null;
  const t = await getTranslations("Profile");
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <SectionHeader
        id={id}
        title={title}
        action={
          <Link
            href="/biblioteca"
            aria-label={t("seeAllIn", { section: title })}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("seeAll")}
          </Link>
        }
      />
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6 max-sm:[&>li:nth-child(n+4)]:hidden">
        {items.map((item) => (
          <li key={item.titleId}>
            <LibraryCard item={item} showSeen />
          </li>
        ))}
      </ul>
    </section>
  );
}
