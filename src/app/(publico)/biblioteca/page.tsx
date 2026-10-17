import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { requireUser } from "@/app/_auth/session";
import { LibraryFilters } from "@/app/_library/library-filters";
import { LibraryList } from "@/app/_library/library-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("LibraryPage");
  return { title: `${t("title")} · Flomo`, description: t("description") };
}

export default function BibliotecaPage() {
  return (
    <>
      <Heading />
      <Suspense fallback={<p className="text-muted-foreground">…</p>}>
        <Body />
      </Suspense>
    </>
  );
}

async function Heading() {
  const t = await getTranslations("LibraryPage");
  return <h1 className="text-3xl font-bold">{t("title")}</h1>;
}

async function Body() {
  const t = await getTranslations("LibraryPage");
  // Confere o login antes de montar a tela.
  await requireUser("/biblioteca");
  return (
    <LibraryFilters
      initial={<LibraryList filter="all" />}
      labels={{
        filters: t("filters"),
        filter: {
          all: t("filter.all"),
          watching: t("filter.watching"),
          watchlist: t("filter.watchlist"),
          paused: t("filter.paused"),
          watched: t("filter.watched"),
          hidden: t("filter.hidden"),
        },
      }}
    />
  );
}
