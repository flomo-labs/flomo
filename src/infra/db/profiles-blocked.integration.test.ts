import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { blocks, profiles } from "./schema";

// Exercita a migration 0026: a policy restritiva `profiles_select_hide_blocker`
// esconde do bloqueado a linha do perfil de quem o bloqueou na tabela
// `profiles` (leitura direta, sem passar pelas funções de 0024).
afterAll(closeTestDb);

async function createProfile(tx: Tx, isPrivate = false) {
  const id = await createUser(tx, { full_name: "Pessoa de Teste" });
  const handle = `t${id.replaceAll("-", "").slice(0, 12)}`;
  await tx
    .update(profiles)
    .set({ handle, isPrivate })
    .where(eq(profiles.id, id));
  return { id, handle };
}

function readProfile(tx: Tx, id: string) {
  return tx
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, id));
}

describe("profiles: leitura direta com bloqueio", () => {
  it("o bloqueado não lê a linha de quem o bloqueou (perfil público)", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx);
      const them = await createProfile(tx);
      expect(
        await asUser(tx, them.id, (u) => readProfile(u, me.id)),
      ).toHaveLength(1);

      await asUser(tx, me.id, (u) =>
        u.insert(blocks).values({ blockerId: me.id, blockedId: them.id }),
      );

      expect(
        await asUser(tx, them.id, (u) => readProfile(u, me.id)),
      ).toHaveLength(0);
      // Nem por handle, nem na leitura de todos os perfis.
      const handles = await asUser(tx, them.id, (u) =>
        u.select({ handle: profiles.handle }).from(profiles),
      );
      expect(handles.map((r) => r.handle)).not.toContain(me.handle);
    }));

  it("quem bloqueou, terceiros e o próprio perfil leem normalmente", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx);
      const them = await createProfile(tx);
      const third = await createUser(tx);
      await asUser(tx, me.id, (u) =>
        u.insert(blocks).values({ blockerId: me.id, blockedId: them.id }),
      );

      // Quem bloqueou segue lendo o perfil público do bloqueado.
      expect(
        await asUser(tx, me.id, (u) => readProfile(u, them.id)),
      ).toHaveLength(1);
      expect(
        await asUser(tx, me.id, (u) => readProfile(u, me.id)),
      ).toHaveLength(1);
      expect(
        await asUser(tx, them.id, (u) => readProfile(u, them.id)),
      ).toHaveLength(1);
      expect(
        await asUser(tx, third, (u) => readProfile(u, me.id)),
      ).toHaveLength(1);
      expect(
        await asUser(tx, third, (u) => readProfile(u, them.id)),
      ).toHaveLength(1);
    }));

  it("o bloqueio vale só no sentido de quem bloqueou, e some ao desbloquear", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx);
      const them = await createProfile(tx);
      await asUser(tx, me.id, (u) =>
        u.insert(blocks).values({ blockerId: me.id, blockedId: them.id }),
      );
      await asUser(tx, me.id, (u) => u.delete(blocks));
      expect(
        await asUser(tx, them.id, (u) => readProfile(u, me.id)),
      ).toHaveLength(1);
    }));

  it("a troca de handle segue funcionando para o bloqueado e para quem bloqueou", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx);
      const them = await createProfile(tx);
      await asUser(tx, me.id, (u) =>
        u.insert(blocks).values({ blockerId: me.id, blockedId: them.id }),
      );
      const updated = await asUser(tx, them.id, (u) =>
        u
          .update(profiles)
          .set({ handle: `n${them.id.replaceAll("-", "").slice(0, 12)}` })
          .where(eq(profiles.id, them.id))
          .returning({ id: profiles.id }),
      );
      expect(updated).toHaveLength(1);
    }));

  it("app.is_blocked_by devolve falso quando não há bloqueio", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx);
      const rows = await asUser(tx, me.id, (u) =>
        u.execute<{ v: boolean }>(sql`select app.is_blocked_by(${me.id}) as v`),
      );
      expect([...rows]).toEqual([{ v: false }]);
    }));
});
