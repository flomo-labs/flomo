import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DiscoverShelves } from "@/app/_catalog/discover-shelves";
import { SearchForm } from "@/components/catalog/search-form";

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
      <DiscoverShelves />
    </>
  );
}
