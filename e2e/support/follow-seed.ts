import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { assertLocalEnv } from "./local-only";

// Apoio dos E2E de seguidores que precisa do banco direto: criar muita gente
// de uma vez (paginação das listas) e trocar o limite de pedidos de seguir.
// Usa o usuário administrativo (`DATABASE_URL_MIGRATIONS`), que ignora o RLS e
// não passa pelo limite de pedidos; só roda no Supabase local.
async function withAdminSql<T>(fn: (sql: postgres.Sql) => Promise<T>) {
  assertLocalEnv(["DATABASE_URL_MIGRATIONS"]);
  const url = process.env.DATABASE_URL_MIGRATIONS;
  if (!url) {
    throw new Error("Defina DATABASE_URL_MIGRATIONS do Supabase local.");
  }
  const sql = postgres(url, { max: 1 });
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

export type SeededPerson = { id: string; handle: string; name: string };

// Cria `count` perfis públicos (usuário em auth.users + perfil pelo gatilho de
// cadastro), com @handle e nome previsíveis: "Pessoa 01", "Pessoa 02"...
export async function seedPeople(count: number): Promise<SeededPerson[]> {
  const run = randomUUID().slice(0, 6);
  const people = Array.from({ length: count }, (_, i) => ({
    id: randomUUID(),
    handle: `sd${run}.${i + 1}`,
    name: `Pessoa ${String(i + 1).padStart(2, "0")} ${run}`,
  }));
  await withAdminSql(async (sql) => {
    for (const p of people) {
      await sql`
        insert into auth.users (id, email, raw_user_meta_data)
        values (${p.id}, ${`${p.id}@teste.flomo.invalid`},
                ${sql.json({ full_name: p.name })})`;
      await sql`update public.profiles set handle = ${p.handle} where id = ${p.id}`;
    }
  });
  return people;
}

// Faz cada pessoa de `followerIds` seguir `followeeId` (vínculo aceito, perfil
// público), com datas espaçadas: o primeiro é o mais antigo, e a lista mostra
// o mais recente primeiro.
export async function seedFollowers(followeeId: string, followerIds: string[]) {
  await withAdminSql(async (sql) => {
    for (const [i, followerId] of followerIds.entries()) {
      await sql`
        insert into public.follows (follower_id, followee_id, created_at)
        values (${followerId}, ${followeeId},
                now() - make_interval(secs => ${followerIds.length - i}))`;
    }
  });
}

// Roda `fn` com mais uma janela de limite de pedidos de seguir (10 minutos,
// `maxCount` pedidos) e a remove no fim, mesmo se `fn` falhar. É somada à
// janela folgada de `ensureFollowLimits`; quem passa de qualquer uma é
// recusado. Cada pessoa nova começa com contador zero.
export async function withFollowLimit<T>(
  maxCount: number,
  fn: () => Promise<T>,
) {
  const windowSeconds = 600;
  await withAdminSql(
    (sql) => sql`
      insert into public.follow_limits (window_seconds, max_count)
      values (${windowSeconds}, ${maxCount})
      on conflict (window_seconds) do update set max_count = excluded.max_count`,
  );
  try {
    return await fn();
  } finally {
    await withAdminSql(
      (sql) =>
        sql`delete from public.follow_limits where window_seconds = ${windowSeconds}`,
    );
  }
}

// Quantos vínculos de seguir (nas duas pontas) e quantos perfis existem para
// a pessoa: depois de excluir a conta, os dois voltam 0.
export async function countLinksOf(personId: string) {
  return withAdminSql(async (sql) => {
    const [row] = await sql<{ follows: number; profiles: number }[]>`
      select
        (select count(*)::int from public.follows
          where follower_id = ${personId} or followee_id = ${personId}) as follows,
        (select count(*)::int from public.profiles where id = ${personId}) as profiles`;
    return row;
  });
}
