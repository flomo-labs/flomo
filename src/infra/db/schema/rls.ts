import { sql } from "drizzle-orm";

// Usuário da requisição nas policies. Sempre como subquery, para o Postgres
// avaliar uma vez por query, e não uma vez por linha (ADR-003).
export const currentUserId = sql`(select app.current_user_id())`;
