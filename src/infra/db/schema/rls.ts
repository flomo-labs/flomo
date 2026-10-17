import { sql } from "drizzle-orm";
import { pgPolicy } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

// Usuário da requisição nas policies. Sempre como subquery, para o Postgres
// avaliar uma vez por query, e não uma vez por linha (ADR-003).
export const currentUserId = sql`(select app.current_user_id())`;

export function ownRowsOnly(table: string, userId: unknown) {
  return pgPolicy(`${table}_all_own`, {
    for: "all",
    to: authenticatedRole,
    using: sql`${userId} = ${currentUserId}`,
    withCheck: sql`${userId} = ${currentUserId}`,
  });
}
