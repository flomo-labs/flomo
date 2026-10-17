import { sql } from "drizzle-orm";
import { check, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { START_SCREENS } from "@/contracts/profile";
import { profiles } from "./profiles";
import { ownRowsOnly } from "./rls";

// Preferências do usuário, separadas do perfil: `profiles` é legível por
// qualquer um nos perfis públicos; aqui só o dono lê e altera a própria linha
// (mesma regra da biblioteca). Morre em cascata com o perfil (ADR-003).
export const userSettings = pgTable(
  "user_settings",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    // Tela em que o usuário começa ao entrar: a Home ou a fila Seguintes.
    startScreen: text("start_screen").notNull().default("home"),
  },
  (t) => [
    check(
      "user_settings_start_screen",
      sql`${t.startScreen} in (${sql.raw(START_SCREENS.map((v) => `'${v}'`).join(", "))})`,
    ),
    ownRowsOnly("user_settings", t.userId),
  ],
);
