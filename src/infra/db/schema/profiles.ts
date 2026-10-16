import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";
import { currentUserId } from "./rls";

// Perfil público do usuário. Nasce pelo trigger em auth.users e morre em
// cascata quando a conta é apagada (ADR-003, seções 6, 7 e 9).
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    displayName: text("display_name"),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    isPrivate: boolean("is_private").notNull().default(false),
    locale: text("locale").notNull().default("pt-BR"),
    country: text("country").notNull().default("BR"),
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),
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
      "profiles_handle_format",
      sql`char_length(${t.handle}) between 5 and 20 and ${t.handle} ~ '^[a-z0-9]+([._][a-z0-9]+)*$'`,
    ),
    // Único ignorando os separadores: renato.silva = renato_silva = renatosilva.
    uniqueIndex("profiles_handle_normalized_key").using(
      "btree",
      sql`replace(replace(${t.handle}, '.', ''), '_', '')`,
    ),
    pgPolicy("profiles_select_public_or_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`not ${t.isPrivate} or ${t.id} = ${currentUserId}`,
    }),
    pgPolicy("profiles_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${t.id} = ${currentUserId}`,
      withCheck: sql`${t.id} = ${currentUserId}`,
    }),
    // Sem policy de insert (o trigger cria) nem de delete (cascata).
  ],
);
