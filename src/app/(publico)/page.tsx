import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getCurrentUser } from "@/app/_auth/session";
import { listShelf } from "@/app/_catalog/gateway";
import { getOwnProfile } from "@/app/_profile/queries";
import { SearchForm } from "@/components/catalog/search-form";
import { Shelf, ShelfSkeleton } from "@/components/catalog/shelf";
import { SHELF_PROVIDERS, type ShelfInput } from "@/contracts/catalog";
import { isProvisionalHandle } from "@/contracts/profile";
import { cn } from "@/lib/utils";

const MEDIA_SEGMENTS = { filmes: "movie", series: "tv" } as const;
type MediaSegment = keyof typeof MEDIA_SEGMENTS;

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
  const profile = await getOwnProfile(user).catch(() => null);
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

// Prateleira que falha some da Home (a página segue útil); o erro fica no log.
async function ShelfItems({
  input,
  ranked = false,
}: {
  input: ShelfInput;
  ranked?: boolean;
}) {
  const result = await listShelf(input);
  if (!result.ok || result.value.length === 0) {
    const t = await getTranslations("Home");
    return <p className="text-muted-foreground">{t("shelfUnavailable")}</p>;
  }
  return <Shelf items={result.value} ranked={ranked} />;
}

// "Em alta no serviço X": serviço e tipo vêm da URL (?servico=8&tipo=series),
// sem JavaScript. Ids de serviço fora da lista caem no primeiro.
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
  const segment: MediaSegment =
    firstValue(params.tipo) === "series" ? "series" : "filmes";

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
        {t("shelf.provider", { provider: provider.name })}
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
          {(["filmes", "series"] as const).map((target) => (
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
