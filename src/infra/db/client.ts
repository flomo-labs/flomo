import { sql } from "drizzle-orm";
import { PgTransaction } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não definida (pooler do Supabase em modo transação).",
    );
  }
  // O pooler em modo transação não aceita prepared statements (ADR-003).
  const client = postgres(url, { prepare: false });
  return drizzle({ client, schema });
}

export type Db = ReturnType<typeof createDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Reaproveita o pool entre recargas do `next dev`.
const globalForDb = globalThis as unknown as { flomoDb?: Db };

// Cliente com o papel do servidor: IGNORA o RLS. Só para catálogo, jobs e
// tarefas administrativas. Dados de usuário passam por `withUser` (ADR-003).
export function getDb(): Db {
  globalForDb.flomoDb ??= createDb();
  return globalForDb.flomoDb;
}

// Claims do JWT já validado pela borda (auth.getClaims()).
export type JwtClaims = { sub: string } & Record<string, unknown>;

const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Executa `fn` numa transação com o papel `authenticated` e as claims do
// usuário, para o Postgres aplicar as policies. `set local` e
// `set_config(…, true)` valem só dentro da transação, o que é seguro no
// pooler em modo transação.
//
// Recebendo uma transação já aberta, `fn` roda num savepoint. Liberar o
// savepoint não desfaz o `set local`, então o papel e as claims são
// limpos ao final para o resto da transação externa voltar ao papel do
// servidor.
export async function withUser<T>(
  claims: JwtClaims,
  fn: (tx: Tx) => Promise<T>,
  db?: Db | Tx,
): Promise<T> {
  if (typeof claims.sub !== "string" || !UUID_FORMAT.test(claims.sub)) {
    throw new Error(
      "withUser exige as claims de um usuário autenticado (sub com o uuid do usuário).",
    );
  }
  // Só abre a conexão depois de validar as claims.
  const conn = db ?? getDb();
  const nested = conn instanceof PgTransaction;
  return conn.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`,
    );
    await tx.execute(sql`set local role authenticated`);
    const result = await fn(tx);
    if (nested) {
      await tx.execute(sql`reset role`);
      await tx.execute(sql`select set_config('request.jwt.claims', '', true)`);
    }
    return result;
  });
}
