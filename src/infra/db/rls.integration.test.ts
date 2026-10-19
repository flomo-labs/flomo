import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { comments, ratings, titles, userSettings } from "./schema";

// Revisão de RLS da Fase 1.6 (migration 0018): confere no catálogo do banco
// as regras que valem para todas as tabelas e funções, para que uma tabela ou
// função nova não escape delas, e cobre o que faltava nas tabelas sociais.
afterAll(closeTestDb);

function pgError(code: string) {
  return expect.objectContaining({
    cause: expect.objectContaining({ code }),
  });
}

const INSUFFICIENT_PRIVILEGE = "42501";
const CHECK_VIOLATION = "23514";

describe("catálogo do banco", () => {
  it("toda tabela do schema public tem RLS ligada", () =>
    inRollback(async (tx) => {
      const rows = await tx.execute<{ table: string }>(sql`
        select c.relname as table
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
      `);
      expect([...rows]).toEqual([]);
    }));

  it("anon não tem permissão em tabela nenhuma", () =>
    inRollback(async (tx) => {
      const rows = await tx.execute<{ table: string; privilege: string }>(sql`
        select table_name as table, privilege_type as privilege
        from information_schema.role_table_grants
        where table_schema = 'public' and grantee = 'anon'
      `);
      expect([...rows]).toEqual([]);
    }));

  it("authenticated não tem TRUNCATE, TRIGGER nem REFERENCES", () =>
    inRollback(async (tx) => {
      const rows = await tx.execute<{ table: string; privilege: string }>(sql`
        select table_name as table, privilege_type as privilege
        from information_schema.role_table_grants
        where table_schema = 'public' and grantee = 'authenticated'
          and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')
      `);
      expect([...rows]).toEqual([]);
    }));

  it("tabela criada depois também nasce sem essas permissões", () =>
    inRollback(async (tx) => {
      await tx.execute(sql`create table public.rls_teste (id int)`);
      const rows = await tx.execute<{ grantee: string; privilege: string }>(sql`
        select grantee, privilege_type as privilege
        from information_schema.role_table_grants
        where table_schema = 'public' and table_name = 'rls_teste'
          and (grantee = 'anon'
            or privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES'))
          and grantee in ('anon', 'authenticated')
      `);
      expect([...rows]).toEqual([]);
    }));

  it("funções security definer fixam o search_path e não são de PUBLIC", () =>
    inRollback(async (tx) => {
      const rows = await tx.execute<{ fn: string }>(sql`
        select p.oid::regprocedure::text as fn
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'app') and p.prosecdef
          and (
            not coalesce(p.proconfig, '{}') && array['search_path=""', 'search_path=']
            or has_function_privilege('public', p.oid, 'execute')
          )
      `);
      expect([...rows]).toEqual([]);
    }));

  it("função criada depois em app nasce sem EXECUTE para PUBLIC", () =>
    inRollback(async (tx) => {
      await tx.execute(
        sql`create function app.rls_teste() returns int language sql as 'select 1'`,
      );
      const [row] = await tx.execute<{ allowed: boolean }>(sql`
        select has_function_privilege('public', 'app.rls_teste()', 'execute') as allowed
      `);
      expect(row.allowed).toBe(false);
    }));

  it("anon e authenticated não apagam tabela inteira", () =>
    inRollback(async (tx) => {
      for (const role of ["anon", "authenticated"]) {
        await expect(
          tx.transaction(async (sp) => {
            await sp.execute(sql.raw(`set local role ${role}`));
            await sp.execute(sql`truncate public.watch_events`);
          }),
        ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
      }
    }));
});

async function createTitle(tx: Tx, mediaType: "movie" | "tv") {
  const [title] = await tx
    .insert(titles)
    .values({ mediaType, originalTitle: `Título ${mediaType}` })
    .returning({ id: titles.id });
  return title.id;
}

describe("nota sem episódio", () => {
  it("vale para filme e é recusada em série", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const movie = await createTitle(tx, "movie");
      const series = await createTitle(tx, "tv");

      await asUser(tx, owner, (utx) =>
        utx
          .insert(ratings)
          .values({ userId: owner, titleId: movie, halfStars: 7 }),
      );
      await expect(
        asUser(tx, owner, (utx) =>
          utx
            .insert(ratings)
            .values({ userId: owner, titleId: series, halfStars: 7 }),
        ),
      ).rejects.toEqual(pgError(CHECK_VIOLATION));

      // Nem trocando o título de uma nota já gravada.
      await expect(
        asUser(tx, owner, (utx) =>
          utx
            .update(ratings)
            .set({ titleId: series })
            .where(eq(ratings.titleId, movie)),
        ),
      ).rejects.toEqual(pgError(CHECK_VIOLATION));
    }));
});

describe("outro usuário não altera nem apaga linhas alheias", () => {
  it("notas, comentários e configurações", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      const movie = await createTitle(tx, "movie");
      await asUser(tx, owner, async (utx) => {
        await utx
          .insert(ratings)
          .values({ userId: owner, titleId: movie, halfStars: 7 });
        await utx
          .insert(comments)
          .values({ userId: owner, titleId: movie, body: "Bom." });
        await utx.insert(userSettings).values({ userId: owner });
      });

      await asUser(tx, other, async (utx) => {
        expect(
          await utx
            .update(ratings)
            .set({ halfStars: 1 })
            .where(eq(ratings.userId, owner))
            .returning(),
        ).toEqual([]);
        expect(
          await utx
            .delete(ratings)
            .where(eq(ratings.userId, owner))
            .returning(),
        ).toEqual([]);
        expect(
          await utx
            .delete(comments)
            .where(eq(comments.userId, owner))
            .returning(),
        ).toEqual([]);
        expect(
          await utx
            .update(userSettings)
            .set({ startScreen: "following" })
            .where(eq(userSettings.userId, owner))
            .returning(),
        ).toEqual([]);
        expect(
          await utx
            .delete(userSettings)
            .where(eq(userSettings.userId, owner))
            .returning(),
        ).toEqual([]);
      });

      // O dono não passa a própria linha para outra pessoa.
      for (const change of [
        (utx: Tx) =>
          utx
            .update(ratings)
            .set({ userId: other })
            .where(eq(ratings.userId, owner)),
        (utx: Tx) =>
          utx
            .update(comments)
            .set({ userId: other })
            .where(eq(comments.userId, owner)),
        (utx: Tx) =>
          utx
            .update(userSettings)
            .set({ userId: other })
            .where(eq(userSettings.userId, owner)),
      ]) {
        await expect(asUser(tx, owner, change)).rejects.toEqual(
          pgError(INSUFFICIENT_PRIVILEGE),
        );
      }

      const [counts] = await tx.execute<{
        r: number;
        c: number;
        s: number;
      }>(sql`
        select
          (select count(*)::int from public.ratings where user_id = ${owner}) as r,
          (select count(*)::int from public.comments where user_id = ${owner}) as c,
          (select count(*)::int from public.user_settings where user_id = ${owner}) as s
      `);
      expect(counts).toEqual({ r: 1, c: 1, s: 1 });
    }));
});

describe("médias públicas", () => {
  it("anon e usuário sem login chamam as funções de média", () =>
    inRollback(async (tx) => {
      const series = await createTitle(tx, "tv");
      for (const role of ["anon", "authenticated"]) {
        await tx.transaction(async (sp) => {
          await sp.execute(sql.raw(`set local role ${role}`));
          await sp.execute(
            sql`select * from app.title_rating_summary(${series}::uuid)`,
          );
          await sp.execute(
            sql`select * from app.title_episode_rating_summary(${series}::uuid)`,
          );
        });
      }
    }));
});

// Usuário com que o app se conecta (migration 0019). Os testes rodam como
// `postgres` e trocam para `flomo_app` com `set local role`, o que confere as
// permissões dele, mas não o login; o papel em si é conferido no catálogo.
const CATALOG_TABLES = [
  "episodes",
  "external_ids",
  "genres",
  "provider_payloads",
  "seasons",
  "title_genres",
  "title_translations",
  "titles",
];

describe("usuário do app (flomo_app)", () => {
  it("não é admin, não ignora o RLS e só vira authenticated", () =>
    inRollback(async (tx) => {
      const [role] = await tx.execute<Record<string, boolean>>(sql`
        select rolsuper, rolbypassrls, rolinherit, rolcreaterole, rolcreatedb,
          pg_has_role('flomo_app', 'authenticated', 'SET') as set_authenticated,
          pg_has_role('flomo_app', 'postgres', 'MEMBER') as postgres_member,
          pg_has_role('flomo_app', 'service_role', 'MEMBER') as service_member
        from pg_roles where rolname = 'flomo_app'
      `);
      expect(role).toEqual({
        rolsuper: false,
        rolbypassrls: false,
        rolinherit: false,
        rolcreaterole: false,
        rolcreatedb: false,
        set_authenticated: true,
        postgres_member: false,
        service_member: false,
      });
    }));

  it("só tem permissão nas tabelas do catálogo", () =>
    inRollback(async (tx) => {
      const rows = await tx.execute<{ table: string }>(sql`
        select distinct table_name as table
        from information_schema.role_table_grants
        where grantee = 'flomo_app'
        order by 1
      `);
      expect(rows.map((r) => r.table)).toEqual(CATALOG_TABLES);
      const owned = await tx.execute(sql`
        select 1 from pg_class c join pg_roles r on r.oid = c.relowner
        where r.rolname = 'flomo_app'
      `);
      expect([...owned]).toEqual([]);
    }));

  it("grava no catálogo e não alcança dados de usuário", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      await tx.execute(sql`set local role flomo_app`);
      const series = await createTitle(tx, "tv");
      await tx.execute(
        sql`select * from app.title_rating_summary(${series}::uuid)`,
      );
      for (const table of [
        "profiles",
        "ratings",
        "comments",
        "user_settings",
      ]) {
        await expect(
          tx.transaction((sp) =>
            sp.execute(sql.raw(`select 1 from public.${table}`)),
          ),
        ).rejects.toThrow(pgError(INSUFFICIENT_PRIVILEGE));
      }
      // Dentro do withUser, as policies valem como para qualquer usuário.
      const own = await asUser(tx, owner, (sp) =>
        sp.execute(sql`select id from public.profiles where id = ${owner}`),
      );
      expect(own.map((r) => r.id)).toEqual([owner]);
    }));
});
