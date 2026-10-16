import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getCurrentUser } from "@/app/_auth/session";
import { listShelf } from "@/app/_catalog/gateway";
import { getOwnProfile } from "@/app/_profile/queries";
import { SearchForm } from "@/components/catalog/search-form";
import { Shelf, ShelfSkeleton } from "@/components/catalog/shelf";
import { SHELF_PROVIDERS, type ShelfInput } from "@/contracts/catalog";
import { isProvisionalHandle } from "@/contracts/profile";
import type { SearchItem } from "@/domain/catalog/types";
import { cn } from "@/lib/utils";

const MEDIA_SEGMENTS = { tudo: "all", filmes: "movie", series: "tv" } as const;
type MediaSegment = keyof typeof MEDIA_SEGMENTS;

// Serviço aberto quando a URL não escolhe um (a lista é alfabética).

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <Hero />
      <Suspense>
        <HandleReminder />
      </Suspense>
      <ShelfSection kind="trending" ranked />
      <ShelfSection kind="now_playing" />
      <Suspense fallback={<ShelfSkeleton />}>
        <ProviderSection searchParams={searchParams} />
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

// Prateleira que falha mostra um aviso no lugar da lista (a Home segue de pé);
// o erro fica no log.
async function ShelfItems({
  input,
  ranked = false,
}: {
  input: ShelfInput;
  ranked?: boolean;
}) {
  // Lê o catálogo a cada requisição (o cache é o do banco): sem isto o Next
  // tentaria montar a prateleira no build, sem banco, e a gravaria no HTML
  // estático.
  await connection();
  const t = await getTranslations("Home");
  let items: SearchItem[] = [];
  try {
    const result = await listShelf(input);
    if (result.ok) items = result.value;
    else console.error("Prateleira indisponível:", result.error);
  } catch (error) {
    console.error("Falha ao carregar a prateleira:", error);
  }
  if (items.length > 0) return <Shelf items={items} ranked={ranked} />;
  return <p className="text-muted-foreground">{t("shelfUnavailable")}</p>;
}

// "Em alta no serviço X": serviço e tipo vêm da URL (?servico=8&tipo=series),
// sem JavaScript. Id ausente ou fora da lista cai no primeiro serviço.
async function ProviderSection({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const t = await getTranslations("Home");
  const params = await searchParams;
  const provider =
    SHELF_PROVIDERS.find((p) => p.id === firstValue(params.servico)) ??
    SHELF_PROVIDERS[0];
  const requested = firstValue(params.tipo);
  const segment: MediaSegment =
    requested === "series" || requested === "filmes" ? requested : "tudo";

  const href = (providerId: string, target: MediaSegment) =>
    `/?servico=${providerId}&tipo=${target}#em-alta-no-servico`;
  const pill = (active: boolean) =>
    cn(
      "inline-flex rounded-lg border px-3 py-1.5 text-sm transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border hover:bg-muted",
    );

  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="em-alta-no-servico"
    >
      <h2 id="em-alta-no-servico" className="text-xl font-semibold">
        {t("shelf.provider", {
          provider: provider.name,
          gender: provider.feminine ? "feminine" : "masculine",
        })}
      </h2>
      <nav aria-label={t("providerNav")}>
        <ul className="flex flex-wrap gap-2">
          {SHELF_PROVIDERS.map((p) => (
            <li key={p.id}>
              <Link
                href={href(p.id, segment)}
                scroll={false}
                aria-current={p.id === provider.id ? "true" : undefined}
                className={pill(p.id === provider.id)}
              >
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-label={t("mediaNav")}>
        <ul className="flex gap-2">
          {(["tudo", "filmes", "series"] as const).map((target) => (
            <li key={target}>
              <Link
                href={href(provider.id, target)}
                scroll={false}
                aria-current={target === segment ? "true" : undefined}
                className={pill(target === segment)}
              >
                {t(`media.${target}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Suspense fallback={<ShelfSkeleton />}>
        <ShelfItems
          input={{
            kind: "provider",
            mediaType: MEDIA_SEGMENTS[segment],
            providerId: provider.id,
          }}
        />
      </Suspense>
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
    </section>
  );
}
