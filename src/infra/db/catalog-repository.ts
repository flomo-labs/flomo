import { and, asc, count, eq, sql } from "drizzle-orm";
import type { CatalogStore } from "@/domain/catalog/ports";
import type {
  CatalogRef,
  MediaType,
  ProviderTitle,
  SearchItem,
  SearchPage,
  TitleStatus,
  WatchProviders,
} from "@/domain/catalog/types";
import type { Db, Tx } from "./client";
import {
  episodes,
  externalIds,
  genres,
  providerPayloads,
  seasons,
  titleGenres,
  titles,
  titleTranslations,
} from "./schema";

// Inserções em lote ficam abaixo do limite de parâmetros do Postgres
// (séries com centenas de episódios numa temporada).
const EPISODE_BATCH = 500;

// Sem prazo gravado (não deveria acontecer), o dado conta como vencido.
const ALREADY_EXPIRED = new Date(0);

function titleResource(ref: CatalogRef) {
  return `${ref.mediaType}/${ref.externalId}`;
}

// Trava até o fim da transação: duas instâncias gravando o mesmo título (ou
// o mesmo gênero) ao mesmo tempo esperam uma pela outra em vez de duplicar.
function lock(tx: Tx, key: string) {
  return tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`,
  );
}

// Cache do catálogo no Postgres. Usa o cliente do servidor (`flomo_app`, que
// só escreve no catálogo, sob as policies dele).
export function createCatalogStore(
  db: Db | Tx,
  provider: string,
): CatalogStore {
  async function upsertPayload(
    tx: Db | Tx,
    resource: string,
    payload: unknown,
    expiresAt: Date,
  ) {
    await tx
      .insert(providerPayloads)
      .values({
        provider,
        resource,
        payload,
        fetchedAt: sql`now()`,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [providerPayloads.provider, providerPayloads.resource],
        set: {
          payload: sql`excluded.payload`,
          fetchedAt: sql`excluded.fetched_at`,
          expiresAt: sql`excluded.expires_at`,
        },
      });
  }

  async function readPayload<T>(
    resource: string,
  ): Promise<{ value: T; expiresAt: Date } | null> {
    const [row] = await db
      .select({
        payload: providerPayloads.payload,
        expiresAt: providerPayloads.expiresAt,
      })
      .from(providerPayloads)
      .where(
        and(
          eq(providerPayloads.provider, provider),
          eq(providerPayloads.resource, resource),
        ),
      );
    return row ? { value: row.payload as T, expiresAt: row.expiresAt } : null;
  }

  async function upsertGenre(
    tx: Tx,
    genre: ProviderTitle["genres"][number],
  ): Promise<string> {
    await lock(tx, `${provider}:genre:${genre.externalId}`);
    const [existing] = await tx
      .select({ id: externalIds.entityId })
      .from(externalIds)
      .where(
        and(
          eq(externalIds.provider, provider),
          eq(externalIds.entityType, "genre"),
          eq(externalIds.externalId, genre.externalId),
        ),
      );
    if (existing) {
      await tx
        .update(genres)
        .set({ name: genre.name, updatedAt: sql`now()` })
        .where(
          and(eq(genres.id, existing.id), sql`${genres.name} <> ${genre.name}`),
        );
      return existing.id;
    }
    const [created] = await tx
      .insert(genres)
      .values({ name: genre.name })
      .returning({ id: genres.id });
    await tx.insert(externalIds).values({
      provider,
      entityType: "genre",
      externalId: genre.externalId,
      entityId: created.id,
    });
    return created.id;
  }

  return {
    async readSearch(key) {
      return readPayload<SearchPage>(key);
    },

    async writeSearch(key, page, expiresAt) {
      await upsertPayload(db, key, page, expiresAt);
    },

    async readShelf(key) {
      return readPayload<SearchItem[]>(key);
    },

    async writeShelf(key, items, expiresAt) {
      await upsertPayload(db, key, items, expiresAt);
    },

    async readWatchProviders(key) {
      return readPayload<WatchProviders>(key);
    },

    async writeWatchProviders(key, providers, expiresAt) {
      await upsertPayload(db, key, providers, expiresAt);
    },

    async findTitleByRef(ref) {
      const [row] = await db
        .select({ id: externalIds.entityId })
        .from(externalIds)
        .where(
          and(
            eq(externalIds.provider, provider),
            eq(externalIds.entityType, ref.mediaType),
            eq(externalIds.externalId, ref.externalId),
          ),
        );
      return row ?? null;
    },

    async postponeTitle(ref, expiresAt) {
      await db
        .update(providerPayloads)
        .set({ expiresAt })
        .where(
          and(
            eq(providerPayloads.provider, provider),
            eq(providerPayloads.resource, titleResource(ref)),
          ),
        );
    },

    async readTitle(id, locale) {
      const [row] = await db
        .select({
          id: titles.id,
          mediaType: titles.mediaType,
          originalTitle: titles.originalTitle,
          originalLanguage: titles.originalLanguage,
          releaseDate: titles.releaseDate,
          runtime: titles.runtime,
          status: titles.status,
          backdropPath: titles.backdropPath,
          tmdbVoteAverage: titles.tmdbVoteAverage,
          tmdbVoteCount: titles.tmdbVoteCount,
          title: titleTranslations.title,
          overview: titleTranslations.overview,
          posterPath: titleTranslations.posterPath,
          externalId: externalIds.externalId,
          expiresAt: providerPayloads.expiresAt,
        })
        .from(titles)
        .innerJoin(
          externalIds,
          and(
            eq(externalIds.entityId, titles.id),
            eq(externalIds.provider, provider),
            eq(externalIds.entityType, titles.mediaType),
          ),
        )
        .leftJoin(
          titleTranslations,
          and(
            eq(titleTranslations.titleId, titles.id),
            eq(titleTranslations.locale, locale),
          ),
        )
        .leftJoin(
          providerPayloads,
          and(
            eq(providerPayloads.provider, provider),
            eq(
              providerPayloads.resource,
              sql`${externalIds.entityType} || '/' || ${externalIds.externalId}`,
            ),
          ),
        )
        .where(eq(titles.id, id));
      if (!row) return null;

      const [genreRows, seasonRows] = await Promise.all([
        db
          .select({ name: genres.name })
          .from(titleGenres)
          .innerJoin(genres, eq(genres.id, titleGenres.genreId))
          .where(eq(titleGenres.titleId, id))
          .orderBy(asc(genres.name)),
        db
          .select({
            id: seasons.id,
            seasonNumber: seasons.seasonNumber,
            name: seasons.name,
            airDate: seasons.airDate,
            posterPath: seasons.posterPath,
            episodeCount: count(episodes.id),
          })
          .from(seasons)
          .leftJoin(episodes, eq(episodes.seasonId, seasons.id))
          .where(eq(seasons.titleId, id))
          .groupBy(seasons.id)
          .orderBy(asc(seasons.seasonNumber)),
      ]);

      const mediaType = row.mediaType as MediaType;
      return {
        value: {
          ref: { mediaType, externalId: row.externalId },
          title: {
            id: row.id,
            mediaType,
            title: row.title ?? row.originalTitle,
            originalTitle: row.originalTitle,
            originalLanguage: row.originalLanguage,
            overview: row.overview,
            releaseDate: row.releaseDate,
            runtime: row.runtime,
            status: row.status as TitleStatus,
            posterPath: row.posterPath,
            backdropPath: row.backdropPath,
            tmdbRating:
              row.tmdbVoteAverage !== null && row.tmdbVoteCount !== null
                ? {
                    average: Number(row.tmdbVoteAverage),
                    count: row.tmdbVoteCount,
                  }
                : null,
            genres: genreRows.map((g) => g.name),
            seasons: seasonRows,
          },
        },
        expiresAt: row.expiresAt ?? ALREADY_EXPIRED,
      };
    },

    writeTitle(title, expiresAt) {
      const { ref } = title;
      return db.transaction(async (tx) => {
        await lock(tx, `${provider}:${ref.mediaType}:${ref.externalId}`);

        const [existing] = await tx
          .select({ id: externalIds.entityId })
          .from(externalIds)
          .where(
            and(
              eq(externalIds.provider, provider),
              eq(externalIds.entityType, ref.mediaType),
              eq(externalIds.externalId, ref.externalId),
            ),
          );

        const values = {
          mediaType: ref.mediaType,
          originalTitle: title.originalTitle,
          originalLanguage: title.originalLanguage,
          releaseDate: title.releaseDate,
          runtime: title.runtime,
          status: title.status,
          backdropPath: title.backdropPath,
          tmdbVoteAverage:
            title.voteAverage === null ? null : title.voteAverage.toFixed(1),
          tmdbVoteCount: title.voteCount,
        };
        let titleId: string;
        if (existing) {
          titleId = existing.id;
          await tx
            .update(titles)
            .set({ ...values, updatedAt: sql`now()` })
            .where(eq(titles.id, titleId));
        } else {
          const [created] = await tx
            .insert(titles)
            .values(values)
            .returning({ id: titles.id });
          titleId = created.id;
          await tx.insert(externalIds).values({
            provider,
            entityType: ref.mediaType,
            externalId: ref.externalId,
            entityId: titleId,
          });
        }

        const { translation } = title;
        await tx
          .insert(titleTranslations)
          .values({
            titleId,
            locale: translation.locale,
            title: translation.title,
            overview: translation.overview,
            posterPath: translation.posterPath,
          })
          .onConflictDoUpdate({
            target: [titleTranslations.titleId, titleTranslations.locale],
            set: {
              title: sql`excluded.title`,
              overview: sql`excluded.overview`,
              posterPath: sql`excluded.poster_path`,
              updatedAt: sql`now()`,
            },
          });

        // Ordem fixa das travas de gênero, para duas transações nunca se
        // esperarem em ordens opostas.
        const sortedGenres = [...title.genres].sort((a, b) =>
          a.externalId.localeCompare(b.externalId),
        );
        const genreIds: string[] = [];
        for (const genre of sortedGenres) {
          genreIds.push(await upsertGenre(tx, genre));
        }
        await tx.delete(titleGenres).where(eq(titleGenres.titleId, titleId));
        if (genreIds.length > 0) {
          await tx
            .insert(titleGenres)
            .values(genreIds.map((genreId) => ({ titleId, genreId })))
            .onConflictDoNothing();
        }

        for (const season of title.seasons) {
          const [savedSeason] = await tx
            .insert(seasons)
            .values({
              titleId,
              seasonNumber: season.seasonNumber,
              name: season.name,
              overview: season.overview,
              airDate: season.airDate,
              posterPath: season.posterPath,
            })
            .onConflictDoUpdate({
              target: [seasons.titleId, seasons.seasonNumber],
              set: {
                name: sql`excluded.name`,
                overview: sql`excluded.overview`,
                airDate: sql`excluded.air_date`,
                posterPath: sql`excluded.poster_path`,
                updatedAt: sql`now()`,
              },
            })
            .returning({ id: seasons.id });

          for (let i = 0; i < season.episodes.length; i += EPISODE_BATCH) {
            const batch = season.episodes.slice(i, i + EPISODE_BATCH);
            await tx
              .insert(episodes)
              .values(
                batch.map((episode) => ({
                  seasonId: savedSeason.id,
                  episodeNumber: episode.episodeNumber,
                  name: episode.name,
                  overview: episode.overview,
                  airDate: episode.airDate,
                  runtime: episode.runtime,
                })),
              )
              .onConflictDoUpdate({
                target: [episodes.seasonId, episodes.episodeNumber],
                set: {
                  name: sql`excluded.name`,
                  overview: sql`excluded.overview`,
                  airDate: sql`excluded.air_date`,
                  runtime: sql`excluded.runtime`,
                  updatedAt: sql`now()`,
                },
              });
          }
        }

        // Os episódios já estão nas tabelas; o payload guarda o resto, para
        // o prazo de validade e para reprocessar sem chamar o provedor.
        const payload = {
          ...title,
          seasons: title.seasons.map((season) => ({
            ...season,
            episodes: undefined,
          })),
        };
        await upsertPayload(tx, titleResource(ref), payload, expiresAt);

        return titleId;
      });
    },

    async readEpisodes(titleId, seasonNumber) {
      const [season] = await db
        .select({ id: seasons.id })
        .from(seasons)
        .where(
          and(
            eq(seasons.titleId, titleId),
            eq(seasons.seasonNumber, seasonNumber),
          ),
        );
      if (!season) return null;
      return db
        .select({
          id: episodes.id,
          episodeNumber: episodes.episodeNumber,
          name: episodes.name,
          overview: episodes.overview,
          airDate: episodes.airDate,
          runtime: episodes.runtime,
        })
        .from(episodes)
        .where(eq(episodes.seasonId, season.id))
        .orderBy(asc(episodes.episodeNumber));
    },
  };
}
