import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getCurrentUser } from "@/app/_auth/session";
import { buildProviderBundle } from "@/app/_catalog/provider-shelf";
import { ShelfItems } from "@/app/_catalog/shelf-items";
import { FollowingShortcut } from "@/app/_library/following";
import { getOwnProfile } from "@/app/_profile/queries";
import { SearchForm } from "@/components/catalog/search-form";
import { ProviderShelf } from "@/components/catalog/provider-shelf";
import { ShelfSkeleton } from "@/components/catalog/shelf";
import { SHELF_PROVIDERS } from "@/contracts/catalog";
import { isProvisionalHandle } from "@/contracts/profile";

export default function Home() {
  return (
    <>
      <Hero />
      <Suspense>
        <HandleReminder />
      </Suspense>
      <Suspense>
        <FollowingShortcut />
      </Suspense>
      <ShelfSection kind="trending" ranked />
      <ShelfSection kind="now_playing" />
      <Suspense fallback={<ShelfSkeleton />}>
        <ProviderSection />
      </Suspense>
    </>
  );
}

async function Hero() {
  const t = await getTranslations("Home");
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Flomo</h1>
        <p className="text-muted-foreground">{t("tagline")}</p>
      </div>
      <SearchForm />
    </section>
  );
}

// Quem entrou mas ainda não escolheu o nome de usuário vê o convite aqui.
async function HandleReminder() {
  const user = await getCurrentUser();
  if (!user) return null;
  // Se o perfil não puder ser lido, melhor não mostrar o convite do que
  // mostrá-lo a quem já escolheu o nome.
  let profile;
  try {
    profile = await getOwnProfile(user);
  } catch (error) {
    console.error("Falha ao ler o perfil na Home:", error);
    return null;
  }
  if (profile && !isProvisionalHandle(profile.handle)) return null;
  const t = await getTranslations("Home");
  return (
    <Link
      href="/cadastro"
      className="rounded-lg border border-border p-3 text-sm underline-offset-4 hover:underline"
    >
      {t("chooseHandle")}
    </Link>
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
  const t = await getTranslations("Home");
  return (
    <h2 id={id} className="text-xl font-semibold">
      {t(`shelf.${id}`)}
    </h2>
  );
}

// "Em alta no serviço X": serviço e tipo mudam na própria tela, sem URL nem
// memória (ao abrir de novo, volta ao primeiro serviço e a "Tudo").
async function ProviderSection() {
  // Lê o catálogo a cada requisição: sem isto o Next tentaria montar a
  // prateleira no build, sem banco, e a gravaria no HTML estático.
  await connection();
  const t = await getTranslations("Home");
  const initial = await buildProviderBundle();
  return (
    <ProviderShelf
      providers={SHELF_PROVIDERS.map(({ id, name }) => ({ id, name }))}
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
