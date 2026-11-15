import { LocalDate } from "@/components/local-date";
import type { Metadata } from "next";
import { tmdbImageUrl } from "@/infra/catalog/tmdb/images";
import { SectionHeader } from "@/components/section-header";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache, Suspense } from "react";
import { getTitleCached } from "@/app/_catalog/cached-title";
import { listSeasonEpisodes as listSeasonEpisodesUncached } from "@/app/_catalog/gateway";
import { SeasonWatchSlot } from "@/app/_library/season-watch-slot";
import { getLibraryState } from "@/app/_library/state";
import { StatusSlot } from "@/app/_library/status-slot";
import { WatchSlot } from "@/app/_library/watch-slot";
import { CommentSection } from "@/app/_comments/comment-section";
import { RatingSlot } from "@/app/_ratings/rating-slot";
import { getRatingSummary } from "@/app/_ratings/state";
import { BackLink } from "@/components/back-link";
import { Poster } from "@/components/catalog/poster";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import { SeasonAccordionItem } from "@/components/catalog/season-accordion-item";
import { WatchProviders } from "@/components/catalog/watch-providers";
import { LoadingRegion } from "@/components/loading/loading-region";
import {
  EpisodeListSkeleton,
  EpisodesSkeleton,
  TitleSkeleton,
} from "@/components/loading/title-skeleton";
import { RatingAverage } from "@/components/rating-average";
import { TmdbRating } from "@/components/tmdb-rating";
import { Badge } from "@/components/ui/badge";
import { CATALOG_COUNTRY, type CatalogTitle } from "@/domain/catalog/types";
import { computeSeasonProgress } from "@/domain/library/season-progress";
import { todayIn } from "@/domain/library/watch-date";
import { sharePreview } from "@/lib/share-preview";
import { cn } from "@/lib/utils";

// Metadados e página leem o mesmo título: uma consulta por requisição (e, com
// o cache do Next, nem isso: o título fica em memória por algumas horas).
const getTitle = cache(getTitleCached);
// O botão da temporada e a lista de episódios leem os mesmos episódios.
const listSeasonEpisodes = cache(listSeasonEpisodesUncached);

export async function generateMetadata({
  params,
}: PageProps<"/titulo/[id]">): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("Title");
  const result = await getTitle(id);
  if (!result.ok)
    return { title: `${t("notFound")} · Flomo`, robots: { index: false } };
  const description = result.value.overview ?? t("metaDescription");
  const poster = tmdbImageUrl(result.value.posterPath, "w780");
  return {
    title: `${result.value.title} · Flomo`,
    description,
    // Preview ao compartilhar: o pôster do próprio título, nunca o de outro.
    ...sharePreview({
      title: `${result.value.title} · Flomo`,
      description,
      image: poster ? { url: poster, alt: result.value.title } : undefined,
    }),
  };
}

export default function TitlePage({
  params,
  searchParams,
}: PageProps<"/titulo/[id]">) {
  return (
    <>
      <BackLink fallbackHref="/descobrir" />
      <Suspense
        fallback={
          <LoadingRegion>
            <TitleSkeleton />
          </LoadingRegion>
        }
      >
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
          priority
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
          <div className="flex w-full flex-wrap gap-3">
            <Suspense fallback={null}>
              <TitleAverage titleId={title.id} />
            </Suspense>
            {title.tmdbRating ? <TmdbRating rating={title.tmdbRating} /> : null}
          </div>
          {title.mediaType === "movie" ? (
            <Suspense fallback={null}>
              <RatingSlot titleId={title.id} showLabel />
            </Suspense>
          ) : null}
          <Suspense fallback={null}>
            <StatusSlot titleId={title.id} />
          </Suspense>
          {title.mediaType === "movie" ? (
            <Suspense fallback={null}>
              <WatchSlot
                kind="movie"
                titleId={title.id}
                hasAirDate={Boolean(title.releaseDate)}
                loginHref={loginHref(`/titulo/${title.id}`)}
                releaseDate={title.releaseDate}
              />
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
        <Suspense
          fallback={
            <LoadingRegion>
              <EpisodesSkeleton />
            </LoadingRegion>
          }
        >
          <Seasons title={title} searchParams={searchParams} />
        </Suspense>
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
// episódios, em cartão. Sem nota nenhuma, o cartão diz "Sem notas ainda".
async function TitleAverage({ titleId }: { titleId: string }) {
  const summary = await getRatingSummary(titleId);
  return <RatingAverage average={summary?.overall ?? null} card />;
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
  searchParams,
}: {
  title: CatalogTitle;
  searchParams: PageProps<"/titulo/[id]">["searchParams"];
}) {
  // `searchParams` só é lido aqui: o cabeçalho e a sinopse não dependem da
  // requisição e saem sem esperar por ele.
  const selected = firstValue((await searchParams).temporada);
  const t = await getTranslations("Title");
  const tl = await getTranslations("Library");
  const label = (n: number) =>
    n === 0 ? t("specials") : t("season", { number: n });
  const regular = title.seasons.filter((s) => s.seasonNumber > 0);

  // Progresso de cada temporada regular para o cabeçalho (e para decidir qual
  // abre sozinha). Vem do que o usuário já viu; visitante não tem progresso.
  const [lists, view] = await Promise.all([
    Promise.all(
      regular.map((s) => listSeasonEpisodes(title.id, s.seasonNumber)),
    ),
    getLibraryState(title.id),
  ]);
  const today = todayIn(CATALOG_COUNTRY, new Date());
  const seasonEpisodes = regular.map((s, i) => ({
    seasonNumber: s.seasonNumber,
    episodes: (lists[i]?.ok ? lists[i].value : []).map((e) => ({
      id: e.id,
      airDate: e.airDate,
    })),
  }));
  const watchedIds =
    view.kind === "ok"
      ? new Set(
          view.state.watched.flatMap((w) => (w.episodeId ? [w.episodeId] : [])),
        )
      : null;
  const progress = watchedIds
    ? computeSeasonProgress(seasonEpisodes, watchedIds, today)
    : null;
  const progressOf = (n: number) =>
    progress?.find((p) => p.seasonNumber === n) ?? null;

  // Aberta: a da URL (`fechadas` = nenhuma); sem ela, a primeira com
  // episódios pendentes; tudo visto, a primeira.
  const openNumber =
    selected === "fechadas"
      ? null
      : (title.seasons.find((s) => String(s.seasonNumber) === selected)
          ?.seasonNumber ??
        progress?.find((p) => p.missing > 0)?.seasonNumber ??
        regular[0]?.seasonNumber ??
        title.seasons[0]?.seasonNumber ??
        null);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="temporadas">
      <SectionHeader
        id="temporadas"
        title={
          <>
            {t("seasons")}{" "}
            <span className="font-normal text-muted-foreground">
              ({regular.length})
            </span>
          </>
        }
      />
      <div
        role="group"
        className="flex flex-col gap-2"
        aria-label={t("seasonsNav")}
      >
        {title.seasons.map((season) => {
          const n = season.seasonNumber;
          const open = n === openNumber;
          const p = progressOf(n);
          const total = season.episodeCount;
          const hasAirDate = seasonEpisodes.some(
            (s) => s.seasonNumber <= n && s.episodes.some((e) => e.airDate),
          );
          return (
            <SeasonAccordionItem
              key={season.id}
              id={`temporada-${n}`}
              title={label(n)}
              open={open}
              toggleHref={`/titulo/${title.id}?temporada=${open ? "fechadas" : n}`}
              progress={
                p
                  ? {
                      watched: p.watched,
                      total: p.total,
                      label: tl("seasonProgress", {
                        watched: p.watched,
                        total: p.total,
                      }),
                    }
                  : null
              }
              summary={p ? undefined : t("episodeCount", { count: total })}
              actions={
                n > 0 ? (
                  <Suspense fallback={null}>
                    <SeasonWatchSlot
                      titleId={title.id}
                      seasonNumber={n}
                      progress={p}
                      anonymous={view.kind === "anonymous"}
                      hasAirDate={hasAirDate}
                      today={today}
                      loginHref={loginHref(
                        `/titulo/${title.id}?temporada=${n}`,
                      )}
                    />
                  </Suspense>
                ) : null
              }
            >
              <Suspense fallback={null}>
                <SeasonAverage titleId={title.id} seasonNumber={n} />
              </Suspense>
              <Suspense
                fallback={
                  <LoadingRegion>
                    <EpisodeListSkeleton />
                  </LoadingRegion>
                }
              >
                <Episodes titleId={title.id} seasonNumber={n} />
              </Suspense>
            </SeasonAccordionItem>
          );
        })}
      </div>
      <ScrollToTopButton label={t("backToTop")} />
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
    <ol className="flex flex-col gap-2">
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
                {episode.airDate ? <LocalDate value={episode.airDate} /> : null}
                {episode.airDate && episode.runtime ? " · " : null}
                {episode.runtime ? `${episode.runtime} min` : null}
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
              releaseDate={episode.airDate}
              position={{
                seasonNumber,
                episodeNumber: episode.episodeNumber,
              }}
              hasAirDate={Boolean(episode.airDate)}
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
