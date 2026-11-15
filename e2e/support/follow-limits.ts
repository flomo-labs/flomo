import postgres from "postgres";
import { assertLocalEnv } from "./local-only";

// O banco recusa criar vínculo de seguir enquanto `follow_limits` estiver
// vazia (falha fechada, migration 0025), e os valores reais são gravados por
// ambiente, nunca no repositório. O Supabase local do E2E nasce vazio, então
// o teste grava uma janela folgada, só se ainda não houver nenhuma. Usa o
// usuário administrativo (`DATABASE_URL_MIGRATIONS`): o `flomo_app` do app não
// escreve nessa tabela.
export async function ensureFollowLimits() {
  assertLocalEnv(["DATABASE_URL_MIGRATIONS"]);
  const url = process.env.DATABASE_URL_MIGRATIONS;
  if (!url) {
    throw new Error("Defina DATABASE_URL_MIGRATIONS do Supabase local.");
  }

  const sql = postgres(url, { max: 1 });
  try {
    await sql`
      insert into public.follow_limits (window_seconds, max_count)
      select 3600, 1000000
      where not exists (select 1 from public.follow_limits)`;
  } finally {
    await sql.end();
  }
}
