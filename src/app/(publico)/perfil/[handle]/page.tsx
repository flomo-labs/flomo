import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { requireUser } from "@/app/_auth/session";
import { loadProfilePage, profilePath } from "@/app/_profile/queries";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProfileStats } from "@/domain/profile/ports";
import { watchedHours } from "@/domain/profile/profile-page";

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
    <Suspense fallback={<p className="text-muted-foreground">…</p>}>
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
          <p className="text-muted-foreground">@{profile.handle}</p>
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
    </article>
  );
}

async function StatsList({ stats, label }: { stats: ProfileStats; label: string }) {
  const t = await getTranslations("Profile");
  const hours = watchedHours(stats.minutesWatched);
  const items = [
    { key: "series", count: stats.seriesCount },
    { key: "movies", count: stats.moviesCount },
    { key: "episodes", count: stats.episodesCount },
    { key: "hours", count: hours },
    { key: "ratings", count: stats.ratingsCount },
  ] as const;
  const format = new Intl.NumberFormat("pt-BR");
  return (
    <section aria-label={label}>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {items.map(({ key, count }) => (
          <div
            key={key}
            className="flex flex-col-reverse rounded-card border border-border p-3"
          >
            <dt className="text-sm text-muted-foreground">{t(key, { count })}</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {format.format(count)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
