import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgPolicy,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import {
  LIBRARY_STATUSES,
  WATCH_EVENT_SOURCES,
  WATCHED_AT_PRECISIONS,
} from "@/domain/library/values";
import { episodes, titles } from "./catalog";
import { profiles } from "./profiles";

// Biblioteca (Fase 1.3, Plano v2 seção 7.1): estado atual separado do
// histórico. `user_titles` e `user_episode_progress` dizem como as coisas
// estão agora; `watch_events` guarda o que aconteceu e é a fonte da verdade.
//
// Dados do usuário morrem em cascata com o perfil (ADR-003, seção 9). O
// catálogo nunca é apagado (episódios que somem do provedor ficam); as
// referências a ele usam `restrict` para o banco recusar, em vez de levar
// junto o histórico de alguém.
//
// RLS: cada usuário só lê e escreve as próprias linhas. Ninguém vê a
// biblioteca de outro por enquanto (perfil público com biblioteca: Fase 2.1).

// Sempre como subquery, para o Postgres avaliar uma vez por query (ADR-003).
const currentUserId = sql`(select app.current_user_id())`;

function ownRowsOnly(table: string, userId: unknown) {
  return pgPolicy(`${table}_all_own`, {
    for: "all",
    to: authenticatedRole,
    using: sql`${userId} = ${currentUserId}`,
    withCheck: sql`${userId} = ${currentUserId}`,
  });
}

function inList(column: unknown, values: readonly string[]) {
  return sql`${column} in (${sql.raw(values.map((v) => `'${v}'`).join(", "))})`;
}

export const userTitles = pgTable(
  "user_titles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "restrict" }),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Mantido pelo trigger app.set_updated_at.
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.titleId] }),
    check("user_titles_status", inList(t.status, LIBRARY_STATUSES)),
    index("user_titles_user_status_updated_idx").on(
      t.userId,
      t.status,
      t.updatedAt.desc(),
    ),
    index("user_titles_title_id_idx").on(t.titleId),
    ownRowsOnly("user_titles", t.userId),
  ],
);

// A linha existir = episódio visto. `title_id` repete o título do episódio
// (preenchido pelo repositório, nunca pelo usuário) para o progresso por
// série e o próximo episódio não juntarem três tabelas.
export const userEpisodeProgress = pgTable(
  "user_episode_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "restrict" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "restrict" }),
    // Nulo quando visto sem data.
    watchedAt: timestamp("watched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.episodeId] }),
    index("user_episode_progress_user_title_idx").on(t.userId, t.titleId),
    index("user_episode_progress_episode_id_idx").on(t.episodeId),
    index("user_episode_progress_title_id_idx").on(t.titleId),
    ownRowsOnly("user_episode_progress", t.userId),
  ],
);

// Histórico de visualizações. `episode_id` nulo = filme. Vários registros do
// mesmo item são permitidos (rever); a idempotência de "marcar visto" fica no
// estado atual. Que série exige episódio e filme não tem é garantido no caso
// de uso (o CHECK não enxerga `titles`).
export const watchEvents = pgTable(
  "watch_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "restrict" }),
    episodeId: uuid("episode_id").references(() => episodes.id, {
      onDelete: "restrict",
    }),
    watchedAt: timestamp("watched_at", { withTimezone: true }),
    watchedAtPrecision: text("watched_at_precision").notNull(),
    source: text("source").notNull(),
    // Check-in (Plano v2, decisão 21): nota do episódio ou filme, 1 a 10
    // (7 = 3,5★). Emoção e personagem favorito entram com as tabelas deles.
    ratingHalfStars: smallint("rating_half_stars"),
    // Quando o registro foi feito; ordena o que está sem data.
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "watch_events_precision",
      inList(t.watchedAtPrecision, WATCHED_AT_PRECISIONS),
    ),
    // Sem data se e só se a precisão é `unknown`.
    check(
      "watch_events_precision_matches_date",
      sql`(${t.watchedAt} is null) = (${t.watchedAtPrecision} = 'unknown')`,
    ),
    check("watch_events_source", inList(t.source, WATCH_EVENT_SOURCES)),
    check(
      "watch_events_rating",
      sql`${t.ratingHalfStars} is null or ${t.ratingHalfStars} between 1 and 10`,
    ),
    // Histórico do usuário, mais recente primeiro; sem data vai para o fim.
    index("watch_events_user_watched_at_idx").on(
      t.userId,
      t.watchedAt.desc().nullsLast(),
      t.id.desc(),
    ),
    index("watch_events_user_episode_idx").on(t.userId, t.episodeId),
    index("watch_events_user_title_idx").on(t.userId, t.titleId),
    index("watch_events_title_id_idx").on(t.titleId),
    index("watch_events_episode_id_idx").on(t.episodeId),
    ownRowsOnly("watch_events", t.userId),
  ],
);
