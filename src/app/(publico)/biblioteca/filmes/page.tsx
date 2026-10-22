import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { requireUser } from "@/app/_auth/session";
import { LibraryViews } from "@/app/_library/library-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("LibraryPage");
  return { title: `${t("moviesTitle")} · Flomo`, description: t("description") };
}

export default function BibliotecaFilmesPage() {
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
  return <h1 className="text-page-title">{t("moviesTitle")}</h1>;
}

async function Body() {
  // Confere o login antes de montar a tela.
  await requireUser("/biblioteca/filmes");
  return <LibraryViews path="/biblioteca/filmes" mediaType="movie" />;
}
