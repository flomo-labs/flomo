import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getTitleByRef } from "@/app/_catalog/gateway";
import { LoadingRegion } from "@/components/loading/loading-region";
import { TitleSkeleton } from "@/components/loading/title-skeleton";
import { Button } from "@/components/ui/button";
import { mediaTypeFromSegment } from "@/lib/title-paths";

export const metadata: Metadata = {
  title: "Flomo",
  robots: { index: false },
};

// Porta de entrada dos resultados de busca: traz o título do provedor (se
// ainda não estiver no banco) e segue para /titulo/<uuid>.
export default function TitleRefPage({
  params,
}: PageProps<"/titulo/ref/[tipo]/[id]">) {
  return (
    <Suspense
      fallback={
        <LoadingRegion>
          <TitleSkeleton />
        </LoadingRegion>
      }
    >
      <Resolve params={params} />
    </Suspense>
  );
}

async function Resolve({
  params,
}: {
  params: PageProps<"/titulo/ref/[tipo]/[id]">["params"];
}) {
  const { tipo, id } = await params;
  const mediaType = mediaTypeFromSegment(tipo);
  if (!mediaType) notFound();

  const result = await getTitleByRef({ mediaType, externalId: id });
  if (result.ok) redirect(`/titulo/${result.value.id}`);
  if (result.error.code !== "CATALOG_UNAVAILABLE") notFound();

  const t = await getTranslations("Title");
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-bold">{t("unavailable")}</h1>
      <p className="text-muted-foreground">{t("unavailableHint")}</p>
      <div className="flex gap-2">
        <Button
          render={
            <Link
              href={`/titulo/ref/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}`}
            />
          }
          nativeButton={false}
        >
          {t("retry")}
        </Button>
        <Button
          variant="outline"
          render={<Link href="/descobrir" />}
          nativeButton={false}
        >
          {t("backToSearch")}
        </Button>
      </div>
    </div>
  );
}
