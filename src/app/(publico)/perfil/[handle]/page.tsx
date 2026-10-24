import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { requireUser } from "@/app/_auth/session";
import { LibraryPreview } from "@/app/_profile/library-preview";
import { loadProfilePage, profilePath } from "@/app/_profile/queries";
import { ScrollHintRow } from "@/components/scroll-hint-row";
import { LoadingRegion } from "@/components/loading/loading-region";
import { PosterGridSkeleton } from "@/components/loading/poster-grid-skeleton";
import { ProfileSkeleton } from "@/components/loading/profile-skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProfileStats } from "@/domain/profile/ports";
import { watchedTime, type WatchedTimePart } from "@/domain/profile/profile-page";

// O título não cita o nome: o perfil pode ser privado, e o metadata sai antes
// da checagem de visibilidade.
export const metadata: Metadata = {
  title: "Perfil · Flomo",
  robots: { index: false },
};

// Perfil em /@handle (reescrito para cá em next.config.ts). Só para quem
// entrou; de perfil privado de outra pessoa, só nome, handle e foto.
export default function ProfilePage({ params }: PageProps<"/perfil/[handle]">) {
  return (
    <Suspense
      fallback={
        <LoadingRegion>
          <ProfileSkeleton />
        </LoadingRegion>
      }
    >
      <ProfileContent params={params} />
    </Suspense>
  );
}

async function ProfileContent({
  params,
}: Pick<PageProps<"/perfil/[handle]">, "params">) {
  const { handle } = await params;
  // O Next já decodifica o parâmetro; nenhum handle válido tem `%`.
  const raw = handle;
  const user = await requireUser(profilePath(raw));
  const result = await loadProfilePage(user, raw);
  if (!result.ok) notFound();
  const { profile, stats, isOwn } = result.value;
  const t = await getTranslations("Profile");
  const name = profile.displayName ?? `@${profile.handle}`;

  return (
    <article className="flex flex-col gap-8">
      <header className="flex items-start gap-4">
        <Avatar size="lg" className="size-16">
          <AvatarFallback className="text-lg">
            {profile.handle.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-2xl font-bold break-words">{name}</h1>
          <p className="text-muted-foreground break-words">@{profile.handle}</p>
          {profile.isPrivate ? (
            <Badge
              variant="secondary"
              className="w-fit"
              title={isOwn ? t("privateHint") : undefined}
            >
              {t("private")}
            </Badge>
          ) : null}
          {profile.canSeeDetails ? (
            <p className="mt-2 whitespace-pre-line break-words">
              {profile.bio ?? (
                <span className="text-muted-foreground">{t("noBio")}</span>
              )}
            </p>
          ) : null}
        </div>
        {isOwn ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/configuracoes" />}
            nativeButton={false}
          >
            {t("edit")}
          </Button>
        ) : null}
      </header>
      {stats ? (
        <StatsList stats={stats} label={t("stats")} />
      ) : (
        <p className="text-muted-foreground">{t("privateLocked")}</p>
      )}
      {isOwn ? (
        <Suspense
          fallback={
            <LoadingRegion>
              <PosterGridSkeleton count={5} />
            </LoadingRegion>
          }
        >
          <LibraryPreview user={user} />
        </Suspense>
      ) : null}
    </article>
  );
}

async function StatsList({
  stats,
  label,
}: {
  stats: ProfileStats;
  label: string;
}) {
  const t = await getTranslations("Profile");
  const format = new Intl.NumberFormat("pt-BR");
  const time = watchedTime(stats.minutesWatched);
  // O número fica grande e a unidade pequena ao lado ("1 mês 15 dias"), para
  // totais enormes caberem no cartão sem passar para o vizinho.
  const unitLabel = (part: WatchedTimePart) =>
    t("timeUnit", part);
  const timeValue = {
    number: format.format(time.primary.value),
    unit: [
      unitLabel(time.primary),
      ...(time.secondary
        ? [format.format(time.secondary.value), unitLabel(time.secondary)]
        : []),
    ].join(" "),
  };
  const items: {
    key: string;
    name: string;
    value: { number: string; unit?: string };
  }[] = [
    {
      key: "series",
      name: t("series", { count: stats.seriesCount }),
      value: { number: format.format(stats.seriesCount) },
    },
    {
      key: "movies",
      name: t("movies", { count: stats.moviesCount }),
      value: { number: format.format(stats.moviesCount) },
    },
    {
      key: "episodes",
      name: t("episodes", { count: stats.episodesCount }),
      value: { number: format.format(stats.episodesCount) },
    },
    { key: "time", name: t("time"), value: timeValue },
    {
      key: "ratings",
      name: t("ratings", { count: stats.ratingsCount }),
      value: { number: format.format(stats.ratingsCount) },
    },
  ];
  // No celular os números rolam para o lado (com a dica de rolagem das
  // temporadas); a partir de md ocupam a linha toda em 5 colunas.
  return (
    <section aria-label={label}>
      <ScrollHintRow>
        <dl className="flex gap-3 md:grid md:grid-cols-5">
          {items.map(({ key, name, value }) => (
            <div
              key={key}
              className="flex min-w-32 shrink-0 flex-col-reverse rounded-card border border-border p-3 md:min-w-0"
            >
              <dt className="text-sm whitespace-nowrap text-muted-foreground">
                {name}
              </dt>
              <dd className="text-2xl font-semibold whitespace-nowrap tabular-nums">
                {value.number}
                {value.unit && (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {value.unit}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </ScrollHintRow>
    </section>
  );
}
