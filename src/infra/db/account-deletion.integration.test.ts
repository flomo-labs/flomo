import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import {
  comments,
  episodes,
  ratings,
  seasons,
  titles,
  userEpisodeProgress,
  userTitles,
  watchEvents,
} from "./schema";

// Exclusão de conta (ADR-003, seção 9): apagar o usuário em auth.users, como
// faz o Supabase Auth, não deixa nenhuma linha dele no banco. As tabelas vêm
// das chaves estrangeiras, então uma tabela nova ligada ao usuário entra no
// teste sozinha, e ele falha até ela ganhar uma linha em `seedEverything`.
afterAll(closeTestDb);

type UserColumn = {
  schema: string;
  table: string;
  column: string;
  onDelete: string;
};

// Colunas das nossas tabelas que apontam para o usuário (auth.users ou
// profiles). Fora disso, só os registros de retenção legal, que guardam o id
// sem FK (ADR-003, seção 9) e ainda não existem.
async function userColumns(tx: Tx) {
  return tx.execute<UserColumn>(sql`
    select n.nspname as schema, cl.relname as table, a.attname as column,
           c.confdeltype as "onDelete"
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
      and n.nspname in ('public', 'app')
    order by 1, 2, 3
  `);
}

async function countRows(tx: Tx, col: UserColumn, userId: string) {
  const [row] = await tx.execute<{ n: number }>(sql`
    select count(*)::int as n
    from ${sql.identifier(col.schema)}.${sql.identifier(col.table)}
    where ${sql.identifier(col.column)} = ${userId}
  `);
  return row.n;
}

// Uma linha do usuário em cada tabela dele, gravada como ele próprio.
async function seedEverything(tx: Tx, userId: string) {
  const [movie] = await tx
    .insert(titles)
    .values({ mediaType: "movie", originalTitle: "Filme de teste" })
    .returning({ id: titles.id });
  const [series] = await tx
    .insert(titles)
    .values({ mediaType: "tv", originalTitle: "Série de teste" })
    .returning({ id: titles.id });
  const [season] = await tx
    .insert(seasons)
    .values({ titleId: series.id, seasonNumber: 1 })
    .returning({ id: seasons.id });
  const [episode] = await tx
    .insert(episodes)
    .values({ seasonId: season.id, episodeNumber: 1 })
    .returning({ id: episodes.id });

  await asUser(tx, userId, async (utx) => {
    await utx
      .insert(userTitles)
      .values({ userId, titleId: series.id, status: "watching" });
    await utx.insert(userEpisodeProgress).values({
      userId,
      episodeId: episode.id,
      titleId: series.id,
      watchedAt: new Date(),
    });
    await utx.insert(watchEvents).values({
      userId,
      titleId: movie.id,
      watchedAt: new Date(),
      watchedAtPrecision: "exact",
      source: "live",
    });
    await utx
      .insert(ratings)
      .values({ userId, titleId: movie.id, halfStars: 7 });
    await utx
      .insert(comments)
      .values({ userId, titleId: movie.id, body: "Comentário de teste" });
  });
}

async function countsByTable(tx: Tx, columns: UserColumn[], userId: string) {
  const counts: Record<string, number> = {};
  for (const col of columns) {
    counts[`${col.schema}.${col.table}.${col.column}`] = await countRows(
      tx,
      col,
      userId,
    );
  }
  return counts;
}

describe("exclusão de conta", () => {
  it("toda tabela ligada ao usuário apaga em cascata", () =>
    inRollback(async (tx) => {
      const columns = await userColumns(tx);
      expect(columns.length).toBeGreaterThan(0);
      // 'c' = on delete cascade.
      expect(columns.filter((col) => col.onDelete !== "c")).toEqual([]);
    }));

  it("apagar o usuário não deixa nenhuma linha dele e preserva a de outro", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      await seedEverything(tx, owner);
      await seedEverything(tx, other);
      const columns = await userColumns(tx);

      // O preparo cobre todas as tabelas: sem isso, "zero depois" não prova
      // nada sobre uma tabela que nunca teve linha.
      const before = await countsByTable(tx, columns, owner);
      for (const [table, n] of Object.entries(before)) {
        expect(n, `sem linha de teste em ${table}`).toBeGreaterThan(0);
      }

      await tx.execute(sql`delete from auth.users where id = ${owner}`);

      const after = await countsByTable(tx, columns, owner);
      expect(after).toEqual(
        Object.fromEntries(Object.keys(before).map((table) => [table, 0])),
      );

      const otherRows = await countsByTable(tx, columns, other);
      for (const [table, n] of Object.entries(otherRows)) {
        expect(n, `linha de outro usuário sumiu em ${table}`).toBeGreaterThan(
          0,
        );
      }
    }));
});
