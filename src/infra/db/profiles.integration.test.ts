import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { type Tx, withUser } from "./client";
import * as schema from "./schema";
import { profiles } from "./schema";

// Exercita o SQL das migrations (policies, CHECK, índice e triggers) no banco
// de desenvolvimento. Roda como `postgres` (admin, ignora o RLS) e troca de
// papel dentro da transação, que é sempre desfeita no fim.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL não definida: confira o .env.local.");
}

const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle({ client, schema });

afterAll(async () => {
  await client.end();
});

class Rollback extends Error {}

// Roda `fn` numa transação que nunca é confirmada.
async function inRollback(fn: (tx: Tx) => Promise<void>) {
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
async function createUser(tx: Tx, metadata: Record<string, string> = {}) {
  const id = randomUUID();
  await tx.execute(
    sql`insert into auth.users (id, email, raw_user_meta_data)
        values (${id}, ${`${id}@teste.flomo.invalid`}, ${JSON.stringify(metadata)}::jsonb)`,
  );
  return id;
}

function asUser<T>(tx: Tx, userId: string, fn: (tx: Tx) => Promise<T>) {
  return withUser({ sub: userId, role: "authenticated" }, fn, tx);
}

// Código do erro do Postgres (o Drizzle embrulha o erro do driver em `cause`).
function pgError(code: string) {
  return expect.objectContaining({
    cause: expect.objectContaining({ code }),
  });
}

const INSUFFICIENT_PRIVILEGE = "42501"; // inclui violação de RLS
const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

async function asAnon<T>(tx: Tx, fn: (tx: Tx) => Promise<T>) {
  return tx.transaction(async (sp) => {
    await sp.execute(sql`set local role anon`);
    return fn(sp);
  });
}

describe("trigger de cadastro", () => {
  it("cria o perfil com handle provisório e dados do Google", () =>
    inRollback(async (tx) => {
      const id = await createUser(tx, {
        full_name: "Pessoa Teste",
        avatar_url: "https://exemplo.invalid/foto.png",
      });

      const [profile] = await tx
        .select()
        .from(profiles)
        .where(eq(profiles.id, id));

      expect(profile.handle).toBe(`u_${id.replaceAll("-", "").slice(0, 12)}`);
      expect(profile.displayName).toBe("Pessoa Teste");
      expect(profile.avatarUrl).toBe("https://exemplo.invalid/foto.png");
      expect(profile).toMatchObject({
        isPrivate: false,
        locale: "pt-BR",
        country: "BR",
        timezone: "America/Sao_Paulo",
      });
    }));

  it("aceita cadastro sem metadados", () =>
    inRollback(async (tx) => {
      const id = await createUser(tx);
      const [profile] = await tx
        .select()
        .from(profiles)
        .where(eq(profiles.id, id));
      expect(profile.displayName).toBeNull();
      expect(profile.avatarUrl).toBeNull();
    }));

  it("apaga o perfil em cascata junto com o usuário", () =>
    inRollback(async (tx) => {
      const id = await createUser(tx);
      await tx.execute(sql`delete from auth.users where id = ${id}`);
      const rows = await tx.select().from(profiles).where(eq(profiles.id, id));
      expect(rows).toHaveLength(0);
    }));
});

describe("policies de profiles", () => {
  it("authenticated vê perfis públicos e o próprio perfil privado, mas não o privado de outro", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      const publicUser = await createUser(tx);
      await tx
        .update(profiles)
        .set({ isPrivate: true })
        .where(eq(profiles.id, owner));

      const seenByOwner = await asUser(tx, owner, (utx) =>
        utx
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.id, owner)),
      );
      expect(seenByOwner).toHaveLength(1);

      const seenByOther = await asUser(tx, other, (utx) =>
        utx
          .select({ id: profiles.id })
          .from(profiles)
          .where(sql`${profiles.id} in (${owner}, ${publicUser})`),
      );
      expect(seenByOther.map((p) => p.id)).toEqual([publicUser]);
    }));

  it("authenticated altera só o próprio perfil", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);

      const updatedByOwner = await asUser(tx, owner, (utx) =>
        utx
          .update(profiles)
          .set({ displayName: "Novo nome" })
          .where(eq(profiles.id, owner))
          .returning({ id: profiles.id }),
      );
      expect(updatedByOwner).toHaveLength(1);

      const updatedByOther = await asUser(tx, other, (utx) =>
        utx
          .update(profiles)
          .set({ displayName: "Invasor" })
          .where(eq(profiles.id, owner))
          .returning({ id: profiles.id }),
      );
      expect(updatedByOther).toHaveLength(0);

      const [profile] = await tx
        .select()
        .from(profiles)
        .where(eq(profiles.id, owner));
      expect(profile.displayName).toBe("Novo nome");
    }));

  it("authenticated não cria nem apaga perfis", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      // Sem o perfil, um insert só falha se o RLS barrar (e não pela PK).
      await tx.delete(profiles).where(eq(profiles.id, owner));

      await expect(
        asUser(tx, owner, (utx) =>
          utx.insert(profiles).values({ id: owner, handle: "outro.handle" }),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));

      await tx.insert(profiles).values({ id: owner, handle: "dono.handle" });

      const deleted = await asUser(tx, owner, (utx) =>
        utx
          .delete(profiles)
          .where(eq(profiles.id, owner))
          .returning({ id: profiles.id }),
      );
      expect(deleted).toHaveLength(0);
    }));

  it("anon não vê perfis", () =>
    inRollback(async (tx) => {
      const id = await createUser(tx);
      const rows = await asAnon(tx, (atx) =>
        atx
          .select({ id: profiles.id })
          .from(profiles)
          .where(eq(profiles.id, id)),
      );
      expect(rows).toHaveLength(0);
    }));

  it("admin (papel do servidor) vê todos os perfis, inclusive privados", () =>
    inRollback(async (tx) => {
      const id = await createUser(tx);
      await tx
        .update(profiles)
        .set({ isPrivate: true })
        .where(eq(profiles.id, id));
      const rows = await tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.id, id));
      expect(rows).toHaveLength(1);
    }));
});

describe("withUser", () => {
  it("devolve o papel do servidor à transação externa ao terminar", () =>
    inRollback(async (tx) => {
      const id = await createUser(tx);
      await asUser(tx, id, async (utx) => {
        const [inside] = await utx.execute<{ role: string }>(
          sql`select current_user as role`,
        );
        expect(inside.role).toBe("authenticated");
      });
      const [after] = await tx.execute<{ role: string; uid: string | null }>(
        sql`select current_user as role, app.current_user_id() as uid`,
      );
      expect(after.role).not.toBe("authenticated");
      expect(after.uid).toBeNull();
    }));

  it("recusa claims sem o uuid do usuário", async () => {
    await expect(
      withUser({ sub: "usuario-1" }, async () => {}),
    ).rejects.toThrow(/uuid/);
  });
});

describe("regras do handle no banco", () => {
  it("rejeita formato inválido", () =>
    inRollback(async (tx) => {
      const id = await createUser(tx);
      for (const handle of [
        "abcd",
        "renato..silva",
        "renato.",
        "Renato",
        "renato-silva",
      ]) {
        await expect(
          tx.transaction((sp) =>
            sp.update(profiles).set({ handle }).where(eq(profiles.id, id)),
          ),
        ).rejects.toEqual(pgError(CHECK_VIOLATION));
      }
    }));

  it("é único ignorando . e _, mas o dono troca entre as próprias variações", () =>
    inRollback(async (tx) => {
      const first = await createUser(tx);
      const second = await createUser(tx);
      await tx
        .update(profiles)
        .set({ handle: "teste.unico" })
        .where(eq(profiles.id, first));

      for (const handle of ["teste_unico", "testeunico"]) {
        await expect(
          tx.transaction((sp) =>
            sp.update(profiles).set({ handle }).where(eq(profiles.id, second)),
          ),
        ).rejects.toEqual(pgError(UNIQUE_VIOLATION));
      }

      await tx
        .update(profiles)
        .set({ handle: "teste_unico" })
        .where(eq(profiles.id, first));
    }));
});

describe("updated_at", () => {
  it("é atualizado pelo trigger em toda alteração", () =>
    inRollback(async (tx) => {
      const id = await createUser(tx);
      const old = new Date("2020-01-01T00:00:00Z");
      // O trigger sobrescreve qualquer valor enviado no update.
      await tx
        .update(profiles)
        .set({ bio: "oi", updatedAt: old })
        .where(eq(profiles.id, id));
      const [profile] = await tx
        .select()
        .from(profiles)
        .where(eq(profiles.id, id));
      expect(profile.updatedAt.getTime()).toBeGreaterThan(old.getTime());
    }));
});
