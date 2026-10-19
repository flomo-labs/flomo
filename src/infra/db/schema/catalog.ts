import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgRole,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

// Catálogo (Fase 1.1, Plano v2 seção 7.3). Dados públicos vindos do provedor
// (hoje o TMDB), gravados só pelo servidor (ADR-003).
// O RLS fica ligado em todas as tabelas: o papel `authenticated` só lê, para
// as consultas de biblioteca (dentro do `withUser`) poderem juntar títulos e
// episódios; quem escreve é o usuário do app no banco, `flomo_app` (criado na
// migration 0019), que só tem acesso ao catálogo. O id do provedor nunca é PK:
// fica em `external_ids`.

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

// Usuário com que o app se conecta. Não é dono das tabelas nem ignora o RLS.
export const flomoAppRole = pgRole("flomo_app").existing();

function writableByApp(table: string) {
  return pgPolicy(`${table}_all_flomo_app`, {
    for: "all",
    to: flomoAppRole,
    using: sql`true`,
    withCheck: sql`true`,
  });
}

function readableByAuthenticated(table: string) {
  return pgPolicy(`${table}_select_authenticated`, {
    for: "select",
    to: authenticatedRole,
    using: sql`true`,
  });
}

export const titles = pgTable(
  "titles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaType: text("media_type").notNull(),
    originalTitle: text("original_title").notNull(),
    originalLanguage: text("original_language"),
    // Filmes: lançamento; séries: estreia.
    releaseDate: date("release_date"),
    // Minutos. Séries: duração típica do episódio.
    runtime: integer("runtime"),
    status: text("status").notNull().default("unknown"),
    backdropPath: text("backdrop_path"),
    // Nota do público no TMDB (0 a 10) e quantos votos a formam. Fica à
    // parte da nota do Flomo e é atualizada junto do resto do título.
    tmdbVoteAverage: numeric("tmdb_vote_average", { precision: 3, scale: 1 }),
    tmdbVoteCount: integer("tmdb_vote_count"),
    ...timestamps,
  },
  (t) => [
    check("titles_media_type", sql`${t.mediaType} in ('movie', 'tv')`),
    check(
      "titles_status",
      sql`${t.status} in ('planned', 'in_production', 'released', 'returning', 'ended', 'canceled', 'unknown')`,
    ),
    check("titles_runtime", sql`${t.runtime} is null or ${t.runtime} >= 0`),
    check(
      "titles_tmdb_vote_average",
      sql`${t.tmdbVoteAverage} is null or ${t.tmdbVoteAverage} between 0 and 10`,
    ),
    check(
      "titles_tmdb_vote_count",
      sql`${t.tmdbVoteCount} is null or ${t.tmdbVoteCount} >= 0`,
    ),
    readableByAuthenticated("titles"),
    writableByApp("titles"),
  ],
);

// Título, sinopse e pôster por idioma (o pôster muda com o idioma no TMDB).
export const titleTranslations = pgTable(
  "title_translations",
  {
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    overview: text("overview"),
    posterPath: text("poster_path"),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.titleId, t.locale] }),
    readableByAuthenticated("title_translations"),
    writableByApp("title_translations"),
  ],
);

// Ids de provedores externos. `entity_type` diz a que tabela `entity_id`
// aponta (sem FK, porque varia): `movie` e `tv` apontam para `titles` (no
// TMDB, filme e série têm sequências de id separadas) e `genre` para
// `genres`. Novos tipos entram por migration, junto do código que os usa.
export const externalIds = pgTable(
  "external_ids",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    entityType: text("entity_type").notNull(),
    externalId: text("external_id").notNull(),
    entityId: uuid("entity_id").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    unique("external_ids_provider_entity_key").on(
      t.provider,
      t.entityType,
      t.externalId,
    ),
    index("external_ids_entity_id_idx").on(t.entityId),
    check(
      "external_ids_entity_type",
      sql`${t.entityType} in ('movie', 'tv', 'genre')`,
    ),
    writableByApp("external_ids"),
  ],
).enableRLS();

// Nome no idioma do catálogo (pt-BR).
export const genres = pgTable(
  "genres",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    ...timestamps,
  },
  () => [readableByAuthenticated("genres"), writableByApp("genres")],
);

export const titleGenres = pgTable(
  "title_genres",
  {
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.titleId, t.genreId] }),
    index("title_genres_genre_id_idx").on(t.genreId),
    readableByAuthenticated("title_genres"),
    writableByApp("title_genres"),
  ],
);

export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    // 0 = especiais.
    seasonNumber: integer("season_number").notNull(),
    name: text("name"),
    overview: text("overview"),
    airDate: date("air_date"),
    posterPath: text("poster_path"),
    ...timestamps,
  },
  (t) => [
    unique("seasons_title_number_key").on(t.titleId, t.seasonNumber),
    check("seasons_number", sql`${t.seasonNumber} >= 0`),
    readableByAuthenticated("seasons"),
    writableByApp("seasons"),
  ],
);

export const episodes = pgTable(
  "episodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    episodeNumber: integer("episode_number").notNull(),
    name: text("name"),
    overview: text("overview"),
    airDate: date("air_date"),
    runtime: integer("runtime"),
    ...timestamps,
  },
  (t) => [
    unique("episodes_season_number_key").on(t.seasonId, t.episodeNumber),
    // Próximos episódios e calendário (Plano v2, seção 7.4).
    index("episodes_season_air_date_idx").on(
      t.seasonId,
      t.airDate,
      t.episodeNumber,
    ),
    check("episodes_number", sql`${t.episodeNumber} >= 0`),
    check("episodes_runtime", sql`${t.runtime} is null or ${t.runtime} >= 0`),
    readableByAuthenticated("episodes"),
    writableByApp("episodes"),
  ],
);

// Cache das respostas do provedor, já reduzidas aos campos usados, com prazo
// de validade. `resource` identifica a consulta (ex.: `tv/1399`,
// `search:pt-BR:1:breaking bad`). Os Termos do TMDB proíbem cache por mais
// de 6 meses: linhas vencidas há muito tempo são apagadas por job (pendente).
export const providerPayloads = pgTable(
  "provider_payloads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    resource: text("resource").notNull(),
    payload: jsonb("payload").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("provider_payloads_provider_resource_key").on(
      t.provider,
      t.resource,
    ),
    index("provider_payloads_expires_at_idx").on(t.expiresAt),
    writableByApp("provider_payloads"),
  ],
).enableRLS();
