import type { Metadata } from "next";
import { SectionHeader } from "@/components/section-header";
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
import { CommentSection } from "@/app/_comments/comment-section";
import { RatingSlot } from "@/app/_ratings/rating-slot";
import { getRatingSummary } from "@/app/_ratings/state";
import { BackLink } from "@/components/back-link";
import { Poster } from "@/components/catalog/poster";
import { WatchProviders } from "@/components/catalog/watch-providers";
import { RatingAverage } from "@/components/rating-average";
import { TmdbRating } from "@/components/tmdb-rating";
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
    <>
      <BackLink fallbackHref="/descobrir" />
      <Suspense fallback={<p className="text-muted-foreground">…</p>}>
        <TitleContent params={params} searchParams={searchParams} />
      </Suspense>
    </>
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
      <header className="flex gap-4 sm:gap-6">
        <Poster
          path={title.posterPath}
          size="w342"
          alt={t("Title.poster", { title: title.title })}
          className="w-24 shrink-0 sm:w-44"
        />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
          <h1 className="text-page-title break-words">{title.title}</h1>
          {title.originalTitle !== title.title ? (
            <p className="text-sm text-muted-foreground italic break-words">
              {t("Title.originalTitle", { title: title.originalTitle })}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">{facts.join(" · ")}</p>
          <Suspense fallback={null}>
            <TitleAverage titleId={title.id} />
          </Suspense>
          {title.tmdbRating ? <TmdbRating rating={title.tmdbRating} /> : null}
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
              <RatingSlot titleId={title.id} />
            </Suspense>
          ) : null}
          {title.genres.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {title.genres.map((genre) => (
                <li key={genre}>
                  <Badge variant="secondary" className="max-w-full truncate">
                    {genre}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      <section className="flex flex-col gap-2" aria-labelledby="sinopse">
        <SectionHeader id="sinopse" title={t("Title.overview")} />
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

      <Suspense fallback={null}>
        <CommentSection
          titleId={title.id}
          loginHref={loginHref(`/titulo/${title.id}`)}
        />
      </Suspense>
    </article>
  );
}

// Média das notas de todos os usuários: do filme ou, na série, de todos os
// episódios. Sem nota nenhuma, nada aparece.
async function TitleAverage({ titleId }: { titleId: string }) {
  const summary = await getRatingSummary(titleId);
  if (!summary?.overall) return null;
  return <RatingAverage average={summary.overall} />;
}

async function SeasonAverage({
  titleId,
  seasonNumber,
}: {
  titleId: string;
  seasonNumber: number;
}) {
  const summary = await getRatingSummary(titleId);
  const average = summary?.bySeason[seasonNumber];
  return average ? <RatingAverage average={average} /> : null;
}

async function EpisodeAverage({
  titleId,
  episodeId,
}: {
  titleId: string;
  episodeId: string;
}) {
  const summary = await getRatingSummary(titleId);
  const average = summary?.byEpisode[episodeId];
  return average ? <RatingAverage average={average} compact /> : null;
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
      <SectionHeader id="temporadas" title={t("seasons")} />
      <nav
        aria-label={t("seasonsNav")}
        className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0"
      >
        <ul className="flex gap-2 md:flex-wrap">
          {title.seasons.map((season) => {
            const active = season.id === current.id;
            return (
              <li key={season.id}>
                <Link
                  href={`/titulo/${title.id}?temporada=${season.seasonNumber}`}
                  scroll={false}
                  replace
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-sm transition-colors md:min-h-9",
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
      <Suspense fallback={null}>
        <SeasonAverage titleId={title.id} seasonNumber={current.seasonNumber} />
      </Suspense>
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
    <ol className="flex max-w-reading flex-col gap-2">
      {result.value.map((episode) => (
        <li
          key={episode.id}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-card border border-border p-4 [&>*:not(:first-child):not(button)]:mt-3"
        >
          <div className="col-span-2 flex min-w-0 flex-col gap-2">
            <p className="font-medium break-words">
              <span className="text-muted-foreground">
                {episode.episodeNumber}.
              </span>{" "}
              {episode.name ??
                t("unnamedEpisode", { number: episode.episodeNumber })}
            </p>
            {episode.overview ? (
              <p className="line-clamp-3 text-sm text-muted-foreground break-words">
                {episode.overview}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-xs text-muted-foreground">
                {[
                  episode.airDate,
                  episode.runtime ? `${episode.runtime} min` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <Suspense fallback={null}>
                <EpisodeAverage titleId={titleId} episodeId={episode.id} />
              </Suspense>
            </div>
          </div>
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
            <RatingSlot titleId={titleId} episodeId={episode.id} />
          </Suspense>
        </li>
      ))}
    </ol>
  );
}
