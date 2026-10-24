import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { requireUser } from "@/app/_auth/session";
import { LoadingRegion } from "@/components/loading/loading-region";
import { PosterGridSkeleton } from "@/components/loading/poster-grid-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { LibraryViews } from "./library-list";
import { LIBRARY_TYPE_PATH, type LibraryType } from "./library-view";

export async function libraryMetadata(): Promise<Metadata> {
  const t = await getTranslations("LibraryPage");
  return { title: `${t("title")} · Flomo`, description: t("description") };
}

// Tela da Biblioteca. As três rotas (tudo, séries, filmes) usam esta mesma
// tela; só muda o recorte com que ela abre.
export function LibraryPage({ type }: { type: LibraryType }) {
  return (
    <>
      <Heading />
      <Suspense
        fallback={
          <LoadingRegion className="flex flex-col gap-6">
            <Skeleton className="h-9 w-64 rounded-full" />
            <PosterGridSkeleton />
          </LoadingRegion>
        }
      >
        <Body type={type} />
      </Suspense>
    </>
  );
}

async function Heading() {
  const t = await getTranslations("LibraryPage");
  return <h1 className="text-page-title">{t("title")}</h1>;
}

async function Body({ type }: { type: LibraryType }) {
  const path = LIBRARY_TYPE_PATH[type];
  // Confere o login antes de montar a tela.
  await requireUser(path);
  return <LibraryViews path={path} initialType={type} />;
}
