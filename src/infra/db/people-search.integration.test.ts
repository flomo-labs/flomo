import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { createPeopleSearchRepository } from "./people-search-repository";
import { blocks, profiles } from "./schema";

// Exercita a migration 0030: `app.search_people` (#357).
afterAll(closeTestDb);

// Termo único por execução: o banco de desenvolvimento tem outros perfis.
const tag = `zq${Date.now().toString(36).slice(-6)}`;

async function person(
  tx: Tx,
  handle: string | null,
  displayName: string | null,
  isPrivate = false,
) {
  const id = await createUser(tx);
  const set: Partial<typeof profiles.$inferInsert> = { displayName, isPrivate };
  if (handle) set.handle = handle;
  await tx.update(profiles).set(set).where(eq(profiles.id, id));
  return id;
}

async function search(
  tx: Tx,
  viewer: string,
  query: string,
  page: { limit: number; after: { rank: number; handle: string } | null } = {
    limit: 50,
    after: null,
  },
) {
  return asUser(tx, viewer, (t) =>
    createPeopleSearchRepository(t).search(query, page),
  );
}

describe("app.search_people", () => {
  it("acha por handle e por nome, sem maiúsculas, acento nem separadores", async () => {
    await inRollback(async (tx) => {
      const me = await person(tx, `eu${tag}`, null);
      const a = await person(tx, `ana.${tag}`, "Joana Álvares");
      const b = await person(tx, `bia_${tag}`, null);
      expect(
        (await search(tx, me, `ANA${tag}`)).map((p) => p.profileId),
      ).toEqual([a]);
      expect(
        (await search(tx, me, `@bia${tag}`)).map((p) => p.profileId),
      ).toEqual([b]);
      expect(
        (await search(tx, me, `alvares`)).map((p) => p.profileId),
      ).toContain(a);
    });
  });

  it("ordena: handle igual, handle começando, palavra do nome, resto", async () => {
    await inRollback(async (tx) => {
      const me = await person(tx, `eu${tag}`, null);
      const exact = await person(tx, `${tag}ord`, null);
      const prefix = await person(tx, `${tag}ordem`, null);
      const name = await person(tx, `zz${tag}b`, `Fulano ${tag}ord`);
      const rows = await search(tx, me, `${tag}ord`);
      expect(rows.map((r) => r.profileId)).toEqual([exact, prefix, name]);
      expect(rows.map((r) => r.rank)).toEqual([0, 1, 2]);
    });
  });

  it("devolve vazio para termo curto, sem login e trata curingas como texto", async () => {
    await inRollback(async (tx) => {
      const me = await person(tx, `eu${tag}`, null);
      await person(tx, `ana${tag}`, null);
      expect(await search(tx, me, "an")).toEqual([]);
      expect(await search(tx, me, "%%%")).toEqual([]);
      expect(await search(tx, me, "___")).toEqual([]);
      const anon = await tx.execute(
        sql`select * from app.search_people(${`ana${tag}`}::text, 10, null, null)`,
      );
      expect([...anon]).toEqual([]);
    });
  });

  it("mostra perfil privado só com os dados públicos, mas não o próprio usuário nem handle provisório", async () => {
    await inRollback(async (tx) => {
      const me = await person(tx, `${tag}eu`, null);
      const priv = await person(tx, `${tag}priv`, "Reservada", true);
      await person(tx, null, `Provisório ${tag}`);
      const rows = await search(tx, me, tag);
      expect(rows.map((r) => r.profileId)).toEqual([priv]);
      expect(Object.keys(rows[0]!).sort()).toEqual([
        "avatarUrl",
        "displayName",
        "handle",
        "profileId",
        "rank",
      ]);
    });
  });

  it("esconde quem bloqueou e quem foi bloqueado, nos dois sentidos", async () => {
    await inRollback(async (tx) => {
      const me = await person(tx, `${tag}eu`, null);
      const blockedByMe = await person(tx, `${tag}um`, null);
      const blocker = await person(tx, `${tag}dois`, null);
      const other = await person(tx, `${tag}tres`, null);
      await asUser(tx, me, (t) =>
        t.insert(blocks).values({ blockerId: me, blockedId: blockedByMe }),
      );
      await asUser(tx, blocker, (t) =>
        t.insert(blocks).values({ blockerId: blocker, blockedId: me }),
      );
      expect((await search(tx, me, tag)).map((r) => r.profileId)).toEqual([
        other,
      ]);
    });
  });

  it("pagina por cursor sem repetir nem pular", async () => {
    await inRollback(async (tx) => {
      const me = await person(tx, `eu${tag}`, null);
      const ids: string[] = [];
      for (const n of [1, 2, 3, 4, 5])
        ids.push(await person(tx, `${tag}p${n}`, null));
      const seen: string[] = [];
      let after: { rank: number; handle: string } | null = null;
      for (let i = 0; i < 5; i++) {
        const rows = await search(tx, me, `${tag}p`, { limit: 2, after });
        if (rows.length === 0) break;
        seen.push(...rows.map((r) => r.profileId));
        const last = rows[rows.length - 1]!;
        after = { rank: last.rank, handle: last.handle };
      }
      expect(seen).toEqual(ids);
    });
  });
});
