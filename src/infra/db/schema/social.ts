import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgPolicy,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { COMMENT_MAX_LENGTH, MODERATION_STATUSES } from "@/contracts/comment";
import { authenticatedRole } from "drizzle-orm/supabase";
import { episodes, titles } from "./catalog";
import { profiles } from "./profiles";
import { currentUserId, ownRowsOnly } from "./rls";

// Avaliações (Fase 1.5): nota e comentário são tabelas separadas (Plano v2,
// seção 3.2).
//
// Mesmas regras da biblioteca: dados do usuário morrem em cascata com o
// perfil (ADR-003, seção 9); o catálogo usa `restrict`, sem índice próprio
// na FK (ver `library.ts`).
//
// RLS: por enquanto cada usuário só lê e escreve as próprias linhas. Ler
// notas e comentários de outros (com a visibilidade e o índice por título)
// entra com o perfil público, na Fase 2.1.

// Nota atual de um filme ou de um episódio (decisão do Renato, 2026-10-18):
// série e temporada não têm nota própria, mostram a média das notas dos
// episódios. Uma nota atual por usuário e item, que pode ser trocada ou
// apagada; `episode_id` nulo = nota do filme. Só se avalia o que foi
// assistido; isso, e que série exige episódio e filme não tem, é garantido no
// caso de uso (o CHECK não enxerga `titles` nem a biblioteca), e o trigger da
// 0011 acerta `title_id` pelo episódio. Desmarcar o item não apaga a nota.
// Difere do Plano v2 (seção 7.1, `ratings` como histórico, com
// `watch_event_id`): se o histórico fizer falta, uma tabela dele nasce depois,
// copiando cada nota atual. A nota do check-in segue em
// `watch_events.rating_half_stars`, sem uso por enquanto.
export const ratings = pgTable(
  "ratings",
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
    // 1 a 10, em meias estrelas (7 = 3,5★), como `halfStarsSchema`.
    halfStars: smallint("half_stars").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Mantido pelo trigger app.set_updated_at.
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("ratings_half_stars", sql`${t.halfStars} between 1 and 10`),
    // Uma nota por filme e uma por episódio. Índices parciais, porque
    // `episode_id` nulo nunca conflita num índice único comum.
    uniqueIndex("ratings_user_movie_uidx")
      .on(t.userId, t.titleId)
      .where(sql`${t.episodeId} is null`),
    uniqueIndex("ratings_user_episode_uidx")
      .on(t.userId, t.episodeId)
      .where(sql`${t.episodeId} is not null`),
    // Notas do usuário num título (as do filme e as de todos os episódios).
    index("ratings_user_title_idx").on(t.userId, t.titleId),
    // Médias do título, somando as notas de todos os usuários
    // (app.title_rating_summary, migration 0013).
    index("ratings_title_idx").on(t.titleId),
    ownRowsOnly("ratings", t.userId),
  ],
);

// Vários comentários por usuário e título, só texto (a nota fica em
// `ratings`). Qualquer usuário logado comenta, tenha assistido ou não. Por
// enquanto só do título. Comentário de temporada ou episódio (Fase 2) entra
// por migration com `season_id`/`episode_id` opcionais (no máximo um), como
// em `watch_events`: `title_id` continua obrigatório, e os comentários atuais
// seguem valendo como do título.
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    containsSpoilers: boolean("contains_spoilers").notNull().default(false),
    // Só o servidor muda: o trigger (migrations 0009, 0010 e 0012) força
    // `published` no insert e recusa a troca no update.
    moderationStatus: text("moderation_status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Última edição do autor (texto ou spoiler), pelo trigger
    // app.set_updated_at; a moderação não conta.
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Até o limite e com pelo menos um caractere que não seja espaço ou
    // quebra de linha.
    check(
      "comments_body",
      sql`char_length(${t.body}) <= ${sql.raw(String(COMMENT_MAX_LENGTH))} and ${t.body} ~ '[^[:space:]]'`,
    ),
    check(
      "comments_moderation_status",
      sql`${t.moderationStatus} in (${sql.raw(MODERATION_STATUSES.map((v) => `'${v}'`).join(", "))})`,
    ),
    // "Meus comentários deste título", mais recente primeiro.
    index("comments_user_title_created_idx").on(
      t.userId,
      t.titleId,
      t.createdAt.desc().nullsFirst(),
      t.id.desc().nullsFirst(),
    ),
    ownRowsOnly("comments", t.userId),
  ],
);

// Seguidores (Fase 2.1). Uma linha por par seguidor → seguido, com estado:
// `accepted` (segue; perfil público segue direto) ou `requested` (solicitação
// a perfil privado, esperando o dono). Quem foi aceito vê o perfil completo,
// como se fosse público (app.profile_card e app.profile_stats).
//
// - Morre em cascata com qualquer um dos dois perfis (ADR-003, seção 9).
// - Sem seguir a si mesmo.
// - O estado de nascimento não vem do cliente: o trigger
//   app.follows_set_status grava `accepted` se o perfil seguido é público e
//   `requested` se é privado (a policy não enxerga o perfil privado).
// - RLS: cada lado vê as próprias linhas. Só quem segue cria (e desfaz ou
//   cancela a solicitação); só o seguido aceita (único UPDATE permitido,
//   `requested` → `accepted`) e pode recusar ou remover (DELETE).
//   Recusar apaga a linha: quem pediu pode pedir de novo.
export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    followeeId: uuid("followee_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("requested"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Mantido pelo trigger app.set_updated_at.
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followeeId] }),
    check("follows_status", sql`${t.status} in ('requested', 'accepted')`),
    check("follows_not_self", sql`${t.followerId} <> ${t.followeeId}`),
    // Seguidores e solicitações pendentes de um perfil. A lista de quem a
    // pessoa segue usa o índice da chave primária (follower_id primeiro).
    index("follows_followee_status_idx").on(t.followeeId, t.status),
    pgPolicy("follows_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.followerId} = ${currentUserId} or ${t.followeeId} = ${currentUserId}`,
    }),
    pgPolicy("follows_insert_as_follower", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${t.followerId} = ${currentUserId}`,
    }),
    pgPolicy("follows_accept_as_followee", {
      for: "update",
      to: authenticatedRole,
      using: sql`${t.followeeId} = ${currentUserId}`,
      withCheck: sql`${t.followeeId} = ${currentUserId} and ${t.status} = 'accepted'`,
    }),
    pgPolicy("follows_delete_either_side", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${t.followerId} = ${currentUserId} or ${t.followeeId} = ${currentUserId}`,
    }),
  ],
);
