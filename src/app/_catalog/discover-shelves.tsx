import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import { DiscoverBrowser } from "@/components/catalog/discover-browser";
import { ShelfSkeleton } from "@/components/catalog/shelf";
import { SHELF_PROVIDERS } from "@/contracts/catalog";
import { BASE_SEGMENTS, MEDIA_SEGMENTS, type MediaSegment } from "./segments";
import { ShelfItems } from "./shelf-items";

// Listas da tela Descobrir: em alta, nos cinemas e em alta por serviço. O
// DiscoverBrowser (cliente) escolhe qual mostrar conforme serviço e tipo.
export async function DiscoverShelves() {
  // Lê o catálogo a cada requisição: sem isto o Next tentaria montar as
  // prateleiras no build, sem banco, e as gravaria no HTML estático.
  await connection();
  const t = await getTranslations("Discover");
  const trending: Partial<Record<MediaSegment, ReactNode>> = {};
  const nowPlaying: Partial<Record<MediaSegment, ReactNode>> = {};
  for (const segment of BASE_SEGMENTS) {
    const mediaType = MEDIA_SEGMENTS[segment];
    trending[segment] = (
      <Suspense fallback={<ShelfSkeleton />}>
        <ShelfItems input={{ kind: "trending", mediaType }} ranked />
      </Suspense>
    );
    // Cinemas só têm filmes: com "Séries" a lista some.
    if (segment !== "series") {
      nowPlaying[segment] = (
        <Suspense fallback={<ShelfSkeleton />}>
          <ShelfItems input={{ kind: "now_playing", mediaType }} />
        </Suspense>
      );
    }
  }
  return (
    <DiscoverBrowser
      providers={SHELF_PROVIDERS.map(({ id, name, feminine }) => ({
        id,
        name,
        lead: t("shelf.providerLead", {
          gender: feminine ? "feminine" : "masculine",
        }),
      }))}
      labels={{
        providerNav: t("providerNav"),
        mediaNav: t("mediaNav"),
        allProviders: t("allProviders"),
        trending: t("shelf.trending"),
        trendingLead: t("shelf.trendingLead"),
        nowPlaying: t("shelf.now_playing"),
        media: {
          tudo: t("media.tudo"),
          series: t("media.series"),
          filmes: t("media.filmes"),
          novelas: t("media.novelas"),
          animes: t("media.animes"),
        },
      }}
      trending={trending}
      nowPlaying={nowPlaying}
      footer={
        <p className="text-xs text-muted-foreground">
          {t("providerNote")}{" "}
          <a
            href="https://www.justwatch.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            JustWatch
          </a>
        </p>
      }
    />
  );
}
