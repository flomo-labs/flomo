import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { type Tx, withUser } from "./client";
import * as schema from "./schema";

// Apoio aos testes de integração (`pnpm test:integration`) contra o banco de
// desenvolvimento. Roda como `postgres` (admin, ignora o RLS) e troca de
// papel dentro da transação, que é sempre desfeita no fim.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL não definida: confira o .env.local.");
}

const client = postgres(url, { prepare: false, max: 1 });
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

export function asUser<T>(tx: Tx, userId: string, fn: (tx: Tx) => Promise<T>) {
  return withUser({ sub: userId, role: "authenticated" }, fn, tx);
}
