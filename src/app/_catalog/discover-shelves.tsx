import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SectionHeader } from "@/components/section-header";
import { ProviderShelf } from "@/components/catalog/provider-shelf";
import { ShelfSkeleton } from "@/components/catalog/shelf";
import { SHELF_PROVIDERS } from "@/contracts/catalog";
import { buildProviderBundle } from "./provider-shelf";
import { ShelfItems } from "./shelf-items";

// Listas da tela Descobrir: em alta, nos cinemas e em alta por serviço.
export function DiscoverShelves() {
  return (
    <div className="flex flex-col gap-10 md:gap-12">
      <ShelfSection kind="trending" ranked />
      <ShelfSection kind="now_playing" />
      <Suspense fallback={<ShelfSkeleton />}>
        <ProviderSection />
      </Suspense>
    </div>
  );
}

function ShelfSection({
  kind,
  ranked = false,
}: {
  kind: "trending" | "now_playing";
  ranked?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <ShelfHeading id={kind} />
      <Suspense fallback={<ShelfSkeleton />}>
        <ShelfItems input={{ kind }} ranked={ranked} />
      </Suspense>
    </section>
  );
}

async function ShelfHeading({ id }: { id: string }) {
  const t = await getTranslations("Discover");
  return <SectionHeader id={id} title={t(`shelf.${id}`)} size="lg" />;
}

// "Em alta no serviço X": serviço e tipo mudam na própria tela, sem URL nem
// memória (ao abrir de novo, volta ao primeiro serviço e a "Todos").
async function ProviderSection() {
  // Lê o catálogo a cada requisição: sem isto o Next tentaria montar a
  // prateleira no build, sem banco, e a gravaria no HTML estático.
  await connection();
  const t = await getTranslations("Discover");
  const initial = await buildProviderBundle();
  return (
    <ProviderShelf
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
        media: {
          tudo: t("media.tudo"),
          filmes: t("media.filmes"),
          series: t("media.series"),
          novelas: t("media.novelas"),
        },
      }}
      initial={initial}
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
