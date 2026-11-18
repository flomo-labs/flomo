import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DiscoverShelves } from "@/app/_catalog/discover-shelves";
import { ShelfSkeleton } from "@/components/catalog/shelf";
import { SearchForm } from "@/components/catalog/search-form";
import { LoadingRegion } from "@/components/loading/loading-region";
import { RoadmapTeaser } from "@/components/roadmap-teaser";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Discover");
  return { title: `${t("title")} · Flomo`, description: t("description") };
}

export default async function DescobrirPage() {
  const t = await getTranslations("Discover");
  return (
    <>
      <h1 className="text-page-title">{t("title")}</h1>
      <SearchForm />
      <Suspense
        fallback={
          <LoadingRegion>
            <ShelfSkeleton />
          </LoadingRegion>
        }
      >
        <DiscoverShelves />
      </Suspense>
      <RoadmapTeaser />
    </>
  );
}
