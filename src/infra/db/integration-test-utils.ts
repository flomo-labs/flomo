import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { type Tx, withUser } from "./client";
import * as schema from "./schema";
import { resolveTestDatabaseUrl } from "./test-database-url";

// Apoio aos testes de integração (`pnpm test:integration`) contra o banco de
// desenvolvimento (`DATABASE_URL_TEST`, nunca o `DATABASE_URL` do app). Roda
// como `postgres` (admin, ignora o RLS) e troca de papel dentro da transação,
// que é sempre desfeita no fim.
const client = postgres(resolveTestDatabaseUrl(process.env), {
  prepare: false,
  max: 1,
});
const db = drizzle({ client, schema });

// Chamar no afterAll de cada arquivo de teste.
export async function closeTestDb() {
  await client.end();
}

class Rollback extends Error {}

// Roda `fn` numa transação que nunca é confirmada.
export async function inRollback(fn: (tx: Tx) => Promise<void>) {
  await db
    .transaction(async (tx) => {
      await fn(tx);
      throw new Rollback();
    })
    .catch((error: unknown) => {
      if (!(error instanceof Rollback)) throw error;
    });
}

// Cria um usuário em auth.users, como faz o Supabase Auth no cadastro.
export async function createUser(
  tx: Tx,
  metadata: Record<string, string> = {},
) {
  const id = randomUUID();
  await tx.execute(
    sql`insert into auth.users (id, email, raw_user_meta_data)
        values (${id}, ${`${id}@teste.flomo.invalid`}, ${JSON.stringify(metadata)}::jsonb)`,
  );
  return id;
}

// Troca a configuração de limite de seguir (`follow_limits`) por estas janelas
// (`[segundos, máximo]`), só dentro da transação de teste.
export async function setFollowLimits(
  tx: Tx,
  windows: [windowSeconds: number, maxCount: number][],
) {
  await tx.execute(sql`delete from public.follow_limits`);
  for (const [windowSeconds, maxCount] of windows) {
    await tx.execute(
      sql`insert into public.follow_limits (window_seconds, max_count)
          values (${windowSeconds}, ${maxCount})`,
    );
  }
}

// Sem configuração, o banco recusa criar vínculo (falha fechada, migration
// 0025). Os testes que não tratam do limite recebem uma folga enorme, mas só se
// ainda não houver configuração, para não mexer na que o teste de limite pôs.
async function ensureFollowLimits(tx: Tx) {
  // Se o teste já trocou de papel (ex.: `flomo_app`), o insert seria negado:
  // só o papel administrativo (`role` = none) consegue semear.
  const [row] = await tx.execute<{ role: string }>(
    sql`select current_setting('role') as role`,
  );
  if (row.role !== "none") return;
  await tx.execute(
    sql`insert into public.follow_limits (window_seconds, max_count)
        select 3600, 1000000
        where not exists (select 1 from public.follow_limits)`,
  );
}

export async function asUser<T>(
  tx: Tx,
  userId: string,
  fn: (tx: Tx) => Promise<T>,
) {
  await ensureFollowLimits(tx);
  return withUser({ sub: userId, role: "authenticated" }, fn, tx);
}
