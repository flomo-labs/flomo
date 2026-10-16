import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache, Suspense } from "react";
import {
  getTitle as getTitleUncached,
  listSeasonEpisodes,
} from "@/app/_catalog/gateway";
import { StatusSlot } from "@/app/_library/status-slot";
import { WatchSlot } from "@/app/_library/watch-slot";
import { Poster } from "@/components/catalog/poster";
import { WatchProviders } from "@/components/catalog/watch-providers";
import { Badge } from "@/components/ui/badge";
import type { CatalogTitle } from "@/domain/catalog/types";
import { cn } from "@/lib/utils";

// Metadados e página leem o mesmo título: uma consulta por requisição.
const getTitle = cache(getTitleUncached);

export async function generateMetadata({
  params,
}: PageProps<"/titulo/[id]">): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("Title");
  const result = await getTitle(id);
  if (!result.ok)
    return { title: `${t("notFound")} · Flomo`, robots: { index: false } };
  return {
    title: `${result.value.title} · Flomo`,
    description: result.value.overview ?? t("metaDescription"),
  };
}

export default function TitlePage({
  params,
  searchParams,
}: PageProps<"/titulo/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">…</p>}>
      <TitleContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function TitleContent({
  params,
  searchParams,
}: Pick<PageProps<"/titulo/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const query = await searchParams;
  const result = await getTitle(id);
  if (!result.ok) notFound();
  const title = result.value;
  const t = await getTranslations();

  const year = title.releaseDate?.slice(0, 4);
  const runtime = title.runtime
    ? t(title.mediaType === "tv" ? "Title.episodeRuntime" : "Title.runtime", {
        minutes: title.runtime,
      })
    : null;
  const facts = [
    t(`MediaType.${title.mediaType}`),
    year,
    t(`Status.${title.status}`),
    runtime,
  ].filter(Boolean);

  return (
    <article className="flex flex-col gap-8">
      <header className="flex gap-5">
        <Poster
          path={title.posterPath}
          size="w342"
          alt={t("Title.poster", { title: title.title })}
          className="w-32 shrink-0 sm:w-48"
        />
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="text-3xl font-bold">{title.title}</h1>
          {title.originalTitle !== title.title ? (
            <p className="text-sm text-muted-foreground italic">
              {t("Title.originalTitle", { title: title.originalTitle })}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">{facts.join(" · ")}</p>
          <Suspense fallback={null}>
            <StatusSlot titleId={title.id} />
          </Suspense>
          {title.mediaType === "movie" ? (
            <Suspense fallback={null}>
              <WatchSlot
                kind="movie"
                titleId={title.id}
                loginHref={loginHref(`/titulo/${title.id}`)}
              />
            </Suspense>
          ) : null}
          {title.genres.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {title.genres.map((genre) => (
                <li key={genre}>
                  <Badge variant="secondary">{genre}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      <section className="flex flex-col gap-2" aria-labelledby="sinopse">
        <h2 id="sinopse" className="text-xl font-semibold">
          {t("Title.overview")}
        </h2>
        <p className={cn(!title.overview && "text-muted-foreground")}>
          {title.overview ?? t("Title.noOverview")}
        </p>
      </section>

      <Suspense fallback={null}>
        <WatchProviders titleId={title.id} />
      </Suspense>

      {title.mediaType === "tv" && title.seasons.length > 0 ? (
        <Seasons title={title} selected={firstValue(query.temporada)} />
      ) : null}
    </article>
  );
}

function loginHref(next: string) {
  return `/entrar?next=${encodeURIComponent(next)}`;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function Seasons({
  title,
  selected,
}: {
  title: CatalogTitle;
  selected: string | undefined;
}) {
  const t = await getTranslations("Title");
  // Padrão: a primeira temporada regular (a 0 são os especiais).
  const fallback =
    title.seasons.find((s) => s.seasonNumber > 0) ?? title.seasons[0];
  const current =
    title.seasons.find((s) => String(s.seasonNumber) === selected) ?? fallback;
  const label = (n: number) =>
    n === 0 ? t("specials") : t("season", { number: n });

  return (
    <section className="flex flex-col gap-4" aria-labelledby="temporadas">
      <h2 id="temporadas" className="text-xl font-semibold">
        {t("seasons")}
      </h2>
      <nav aria-label={t("seasonsNav")}>
        <ul className="flex flex-wrap gap-2">
          {title.seasons.map((season) => {
            const active = season.id === current.id;
            return (
              <li key={season.id}>
                <Link
                  href={`/titulo/${title.id}?temporada=${season.seasonNumber}`}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {label(season.seasonNumber)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="text-sm text-muted-foreground">
        {label(current.seasonNumber)} ·{" "}
        {t("episodeCount", { count: current.episodeCount })}
      </p>
      <Suspense fallback={<p className="text-muted-foreground">…</p>}>
        <Episodes titleId={title.id} seasonNumber={current.seasonNumber} />
      </Suspense>
    </section>
  );
}

async function Episodes({
  titleId,
  seasonNumber,
}: {
  titleId: string;
  seasonNumber: number;
}) {
  const t = await getTranslations("Title");
  const result = await listSeasonEpisodes(titleId, seasonNumber);
  if (!result.ok || result.value.length === 0) {
    return <p className="text-muted-foreground">{t("noEpisodes")}</p>;
  }
  return (
    <ol className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {result.value.map((episode) => (
        <li key={episode.id} className="flex flex-col gap-1 p-3">
          <p className="font-medium">
            <span className="text-muted-foreground">
              {episode.episodeNumber}.
            </span>{" "}
            {episode.name ??
              t("unnamedEpisode", { number: episode.episodeNumber })}
          </p>
          {episode.overview ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {episode.overview}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {[
              episode.airDate,
              episode.runtime ? `${episode.runtime} min` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <Suspense fallback={null}>
            <WatchSlot
              kind="episode"
              titleId={titleId}
              episodeId={episode.id}
              position={{
                seasonNumber,
                episodeNumber: episode.episodeNumber,
              }}
              loginHref={loginHref(
                `/titulo/${titleId}?temporada=${seasonNumber}`,
              )}
            />
          </Suspense>
        </li>
      ))}
    </ol>
  );
}
