import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  index,
  integer,
  pgPolicy,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { DISCOVER_PREFERENCES_MAX_ITEMS } from "@/contracts/discover-preferences";
import {
  RECENT_SEARCH_TERM_MAX_LENGTH,
  RECENT_SEARCH_TITLE_MAX_LENGTH,
} from "@/contracts/recent-search";
import { COMMENT_MAX_LENGTH, MODERATION_STATUSES } from "@/contracts/comment";
import { authenticatedRole } from "drizzle-orm/supabase";
import { episodes, seasons, titles } from "./catalog";
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
// `ratings`). Qualquer usuário logado comenta, tenha assistido ou não.
// Comentário de temporada ou episódio usa `season_id`
// ou `episode_id` opcionais (no máximo um; migration 0032): `title_id`
// continua obrigatório e o trigger o acerta pela temporada ou episódio, e os
// comentários antigos seguem valendo como do título.
//
// RLS: o autor lê e escreve os próprios (`comments_all_own`); outras pessoas
// só leem comentário `published` de autor visível a elas (perfil público, ou
// privado com seguidor aceito; sem bloqueio do autor), pela função
// app.comment_author_visible (migration 0032).
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
    seasonId: uuid("season_id").references(() => seasons.id, {
      onDelete: "restrict",
    }),
    episodeId: uuid("episode_id").references(() => episodes.id, {
      onDelete: "restrict",
    }),
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
    // No máximo um entre temporada e episódio.
    check(
      "comments_season_or_episode",
      sql`${t.seasonId} is null or ${t.episodeId} is null`,
    ),
    // Comentários de um título (leitura de outras pessoas), mais recente
    // primeiro.
    index("comments_title_created_idx").on(
      t.titleId,
      t.createdAt.desc().nullsFirst(),
      t.id.desc().nullsFirst(),
    ),
    // "Meus comentários deste título", mais recente primeiro.
    index("comments_user_title_created_idx").on(
      t.userId,
      t.titleId,
      t.createdAt.desc().nullsFirst(),
      t.id.desc().nullsFirst(),
    ),
    ownRowsOnly("comments", t.userId),
    // Soma-se (OR) à policy do dono: outras pessoas leem só o publicado. O
    // conjunto de autores ocultos é calculado uma vez por consulta (0034), não
    // por linha.
    pgPolicy("comments_select_published_visible_author", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.moderationStatus} = 'published' and app.current_user_id() is not null and not exists (select 1 from app.comment_hidden_author_ids() h(id) where h.id = ${t.userId})`,
    }),
  ],
);

// Curtidas nos comentários (#396). Uma linha por par comentário → pessoa que
// curtiu. Só a contagem e o "eu curti" chegam à tela, sem lista de quem curtiu.
//
// - Morre em cascata com o comentário e com o perfil (ADR-003, seção 9).
// - Qualquer usuário logado curte, inclusive o próprio comentário, desde que
//   `app.can_like_comment` (migration 0036) deixe: comentário publicado, autor
//   visível a quem curte e sem bloqueio entre os dois. Descurtir não depende
//   disso (o dono sempre apaga a própria curtida).
// - RLS: cada pessoa só enxerga, cria e apaga as próprias linhas; sem UPDATE.
//   A contagem de todos vem de `app.comment_like_summaries` (security
//   definer), que só devolve comentário que quem pergunta já pode ler.
// - Bloquear não apaga curtidas antigas, e a contagem continua total.
export const commentLikes = pgTable(
  "comment_likes",
  {
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Também serve à contagem por comentário (comment_id vem primeiro).
    primaryKey({ columns: [t.commentId, t.userId] }),
    // Apagar o perfil apaga as curtidas dele em cascata.
    index("comment_likes_user_idx").on(t.userId),
    pgPolicy("comment_likes_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.userId} = ${currentUserId}`,
    }),
    pgPolicy("comment_likes_insert_own_if_allowed", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${t.userId} = ${currentUserId} and app.can_like_comment(${t.commentId})`,
    }),
    pgPolicy("comment_likes_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${t.userId} = ${currentUserId}`,
    }),
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

// Bloqueios entre usuários (Fase 2.1). Uma linha por par quem bloqueou →
// quem foi bloqueado.
//
// - Morre em cascata com qualquer um dos dois perfis (ADR-003, seção 9).
// - Sem bloquear a si mesmo.
// - RLS: só quem bloqueou enxerga, cria e desfaz o próprio bloqueio; o
//   bloqueado nunca enxerga a linha. Sem UPDATE: bloqueio não muda, só se cria
//   ou se desfaz.
// - Efeitos (migration 0024): ao bloquear, o vínculo de seguir some nos dois
//   sentidos (trigger); enquanto houver bloqueio, nenhum dos dois cria
//   vínculo de seguir (app.follows_set_status); o bloqueado deixa de ver o
//   perfil de quem bloqueou (app.profile_card, app.profile_stats e as
//   funções de contagem e listas de seguidores); quem bloqueou só vê nome,
//   handle e foto do bloqueado. Desbloquear não restaura o vínculo.
export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.blockerId, t.blockedId] }),
    check("blocks_not_self", sql`${t.blockerId} <> ${t.blockedId}`),
    // Quem bloqueou um perfil (as checagens de visibilidade olham pelos dois
    // lados; a lista de quem eu bloqueei usa o índice da chave primária).
    index("blocks_blocked_idx").on(t.blockedId),
    pgPolicy("blocks_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.blockerId} = ${currentUserId}`,
    }),
    pgPolicy("blocks_insert_as_blocker", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${t.blockerId} = ${currentUserId}`,
    }),
    pgPolicy("blocks_delete_as_blocker", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${t.blockerId} = ${currentUserId}`,
    }),
  ],
);

// Limite de volume de pedidos de seguir (Fase 2.1, #295). Duas tabelas sem
// policy nem privilégio para o cliente: só o gatilho `follows_rate_limit`
// (security definer, migration 0025) lê e grava.
//
// - `follow_limits`: a configuração, uma linha por janela (`window_seconds` →
//   `max_count`). Os valores NUNCA ficam no repositório: cada ambiente os grava
//   por SQL. Sem nenhuma linha, criar vínculo é recusado (falha fechada).
// - `follow_attempts`: um registro por vínculo criado, apagado pela própria
//   função quando passa da maior janela. Como o registro sobrevive ao
//   `delete` do vínculo, o ciclo seguir e desfazer também conta.
export const followLimits = pgTable(
  "follow_limits",
  {
    windowSeconds: integer("window_seconds").primaryKey(),
    maxCount: integer("max_count").notNull(),
  },
  (t) => [
    check("follow_limits_window_positive", sql`${t.windowSeconds} > 0`),
    check("follow_limits_max_positive", sql`${t.maxCount} > 0`),
  ],
).enableRLS();

export const followAttempts = pgTable(
  "follow_attempts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("follow_attempts_follower_created_idx").on(t.followerId, t.createdAt),
  ],
).enableRLS();

// Preferências da tela Descobrir (Fase 2.10, #111): uma linha por usuário, só
// com o que ele mudou. `order_ids` e `hidden_ids` são listas de ids estáveis
// das listas do Descobrir (`src/contracts/discover-preferences.ts`); o banco só
// limita o tamanho, e quem valida os ids é o Zod (id desconhecido é ignorado na
// leitura e lista nova entra no fim, então lista nova não pede migration).
// Sem linha = ordem e exibição padrão. Morre em cascata com o perfil (ADR-003,
// seção 9); RLS: só o dono lê e escreve a própria linha.
export const discoverPreferences = pgTable(
  "discover_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    orderIds: text("order_ids")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    hiddenIds: text("hidden_ids")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Mantido pelo trigger app.set_updated_at.
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "discover_preferences_order_size",
      sql`cardinality(${t.orderIds}) <= ${sql.raw(String(DISCOVER_PREFERENCES_MAX_ITEMS))}`,
    ),
    check(
      "discover_preferences_hidden_size",
      sql`cardinality(${t.hiddenIds}) <= ${sql.raw(String(DISCOVER_PREFERENCES_MAX_ITEMS))}`,
    ),
    ownRowsOnly("discover_preferences", t.userId),
  ],
);

// Buscas recentes de quem entrou na conta (#425): até 8 por pessoa (o gatilho
// `recent_searches_trim` apaga o excedente, o mais antigo primeiro). Cada linha
// é um termo buscado (`query`), um título aceito da sugestão (`title`, com o que
// a lista mostra) ou uma pessoa aceita (`person`, só o `profile_id`: nome e
// foto vêm do perfil atual, nunca de uma cópia). `dedupe_key` é calculada pelo
// banco e decide a repetição: o termo sem diferenciar maiúsculas, o título pelo
// tipo e id do provedor, a pessoa pelo perfil. Registrar de novo o mesmo item é
// um upsert que o traz para o topo (`used_at`). Os limites de texto repetem
// `src/contracts/recent-search.ts`. Morre em cascata com o perfil de quem
// buscou e com o da pessoa buscada (ADR-003, seção 9). RLS: só o dono lê e
// escreve as próprias linhas; quem filtra pessoa bloqueada na leitura é
// `app.recent_searches` (migration 0037).
export const recentSearches = pgTable(
  "recent_searches",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    term: text("term"),
    mediaType: text("media_type"),
    externalId: text("external_id"),
    title: text("title"),
    year: text("year"),
    posterPath: text("poster_path"),
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "cascade",
    }),
    dedupeKey: text("dedupe_key").generatedAlwaysAs(
      sql`case "kind" when 'query' then 'q:' || lower("term") when 'title' then 't:' || "media_type" || '-' || "external_id" else 'p:' || "profile_id"::text end`,
    ),
    // `clock_timestamp` (e não `now`) para dois registros na mesma transação
    // terem horas diferentes.
    usedAt: timestamp("used_at", { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
    uniqueIndex("recent_searches_user_key_idx").on(t.userId, t.dedupeKey),
    index("recent_searches_user_used_idx").on(t.userId, t.usedAt),
    check(
      "recent_searches_shape",
      sql`(
        ${t.kind} = 'query'
          and ${t.term} is not null and ${t.mediaType} is null and ${t.externalId} is null
          and ${t.title} is null and ${t.year} is null and ${t.posterPath} is null
          and ${t.profileId} is null
      ) or (
        ${t.kind} = 'title'
          and ${t.term} is null and ${t.mediaType} in ('movie', 'tv')
          and ${t.externalId} is not null and ${t.title} is not null
          and ${t.profileId} is null
      ) or (
        ${t.kind} = 'person'
          and ${t.profileId} is not null and ${t.profileId} <> ${t.userId}
          and ${t.term} is null and ${t.mediaType} is null and ${t.externalId} is null
          and ${t.title} is null and ${t.year} is null and ${t.posterPath} is null
      )`,
    ),
    check(
      "recent_searches_term_format",
      sql`${t.term} is null or (${t.term} = btrim(${t.term}) and char_length(${t.term}) between 1 and ${sql.raw(String(RECENT_SEARCH_TERM_MAX_LENGTH))})`,
    ),
    check(
      "recent_searches_title_format",
      sql`${t.kind} <> 'title' or (
        ${t.externalId} ~ '^[1-9][0-9]{0,9}$'
        and char_length(${t.title}) between 1 and ${sql.raw(String(RECENT_SEARCH_TITLE_MAX_LENGTH))}
        and (${t.year} is null or ${t.year} ~ '^[0-9]{4}$')
        and (${t.posterPath} is null or ${t.posterPath} ~ '^/[A-Za-z0-9_-]{1,100}\\.[A-Za-z0-9]{2,5}$')
      )`,
    ),
    ownRowsOnly("recent_searches", t.userId),
  ],
).enableRLS();
