import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { MODERATION_STATUSES, REVIEW_MAX_LENGTH } from "@/contracts/review";
import { titles } from "./catalog";
import { profiles } from "./profiles";
import { ownRowsOnly } from "./rls";

// Avaliações (Fase 1.5): nota e review são tabelas separadas (Plano v2,
// seção 3.2). A nota do episódio ou filme no check-in fica em `watch_events`;
// aqui é a nota do título.
//
// Mesmas regras da biblioteca: dados do usuário morrem em cascata com o
// perfil (ADR-003, seção 9); o catálogo usa `restrict`, sem índice próprio
// na FK (ver `library.ts`).
//
// RLS: por enquanto cada usuário só lê e escreve as próprias linhas. Ler
// notas e reviews de outros (com a visibilidade e o índice por título) entra
// com o perfil público, na Fase 2.1.

// Uma nota atual por usuário e título, que pode ser trocada ou apagada. O
// Plano v2 (seção 7.1) previa `ratings` como histórico; se fizer falta, uma
// tabela de histórico pode nascer depois, copiando cada nota atual. A PK
// é do título: nota de temporada, se vier, ganha tabela própria (a do
// episódio já está em `watch_events`).
export const ratings = pgTable(
  "ratings",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "restrict" }),
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
    primaryKey({ columns: [t.userId, t.titleId] }),
    check("ratings_half_stars", sql`${t.halfStars} between 1 and 10`),
    ownRowsOnly("ratings", t.userId),
  ],
);

// Várias reviews por usuário e título, só texto (a nota fica em `ratings`).
// Por enquanto só do título. Review de temporada ou episódio (Fase 2) entra
// por migration com `season_id`/`episode_id` opcionais (no máximo um), como
// em `watch_events`: `title_id` continua obrigatório, e as reviews atuais
// seguem valendo como do título.
export const reviews = pgTable(
  "reviews",
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
    // O autor não muda: o trigger da 0009 força `published` no insert e
    // recusa a troca no update.
    moderationStatus: text("moderation_status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Mantido pelo trigger app.set_updated_at.
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Até o limite e com pelo menos um caractere que não seja espaço ou
    // quebra de linha.
    check(
      "reviews_body",
      sql`char_length(${t.body}) <= ${sql.raw(String(REVIEW_MAX_LENGTH))} and ${t.body} ~ '[^[:space:]]'`,
    ),
    check(
      "reviews_moderation_status",
      sql`${t.moderationStatus} in (${sql.raw(MODERATION_STATUSES.map((v) => `'${v}'`).join(", "))})`,
    ),
    // "Minhas reviews deste título", mais recente primeiro.
    index("reviews_user_title_created_idx").on(
      t.userId,
      t.titleId,
      t.createdAt.desc().nullsFirst(),
      t.id.desc().nullsFirst(),
    ),
    ownRowsOnly("reviews", t.userId),
  ],
);
