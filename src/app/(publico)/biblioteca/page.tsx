import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import type { LibraryFilter } from "@/contracts/library";
import { requireUser } from "@/app/_auth/session";
import { LibraryFilters } from "@/app/_library/library-filters";
import { LibraryList } from "@/app/_library/library-list";

// Visões da Biblioteca: a padrão (séries e filmes em sub-listas) e os ocultos.
const VIEWS = ["all", "hidden"] as const satisfies readonly LibraryFilter[];

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
  return <h1 className="text-page-title">{t("title")}</h1>;
}

async function Body() {
  const t = await getTranslations("LibraryPage");
  // Confere o login antes de montar a tela.
  await requireUser("/biblioteca");
  // Todas as visões vêm de uma vez: trocar não volta ao servidor.
  const lists = Object.fromEntries(
    VIEWS.map((filter) => [
      filter,
      <Suspense
        key={filter}
        fallback={<p className="text-muted-foreground">…</p>}
      >
        <LibraryList filter={filter} />
      </Suspense>,
    ]),
  ) as Partial<Record<LibraryFilter, ReactNode>>;
  return (
    <LibraryFilters
      filters={VIEWS}
      lists={lists}
      labels={{
        filters: t("filters"),
        filter: { all: t("filter.all"), hidden: t("filter.hidden") },
      }}
    />
  );
}
