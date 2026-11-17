import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { discoverPreferences, profiles } from "./schema";

// Exercita a migration 0035: tabela `discover_preferences` (RLS só do dono,
// cascata a partir do perfil, limite de tamanho e updated_at).
afterAll(closeTestDb);

const INSUFFICIENT_PRIVILEGE = "42501";
const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

function pgError(code: string) {
  return expect.objectContaining({
    cause: expect.objectContaining({ code }),
  });
}

describe("discover_preferences", () => {
  it("anônimo não toca na tabela", () =>
    inRollback(async (tx) => {
      await expect(
        tx.transaction(async (sp) => {
          await sp.execute(sql`set local role anon`);
          await sp.select().from(discoverPreferences);
        }),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("o dono cria, lê, altera e apaga a própria linha; padrão é lista vazia", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      await asUser(tx, me, (utx) =>
        utx.insert(discoverPreferences).values({ userId: me }),
      );
      const [row] = await asUser(tx, me, (utx) =>
        utx.select().from(discoverPreferences),
      );
      expect(row?.orderIds).toEqual([]);
      expect(row?.hiddenIds).toEqual([]);

      await asUser(tx, me, (utx) =>
        utx
          .update(discoverPreferences)
          .set({
            orderIds: ["now_playing", "trending"],
            hiddenIds: ["trending"],
          })
          .where(eq(discoverPreferences.userId, me)),
      );
      const [changed] = await asUser(tx, me, (utx) =>
        utx.select().from(discoverPreferences),
      );
      expect(changed?.orderIds).toEqual(["now_playing", "trending"]);
      expect(changed?.hiddenIds).toEqual(["trending"]);
      expect(changed?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        changed?.createdAt.getTime() ?? 0,
      );

      await asUser(tx, me, (utx) =>
        utx
          .delete(discoverPreferences)
          .where(eq(discoverPreferences.userId, me)),
      );
      expect(
        await asUser(tx, me, (utx) => utx.select().from(discoverPreferences)),
      ).toHaveLength(0);
    }));

  it("ninguém grava nem lê a linha de outro usuário", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      const other = await createUser(tx);
      await expect(
        asUser(tx, me, (utx) =>
          utx.insert(discoverPreferences).values({ userId: other }),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));

      await asUser(tx, other, (utx) =>
        utx.insert(discoverPreferences).values({ userId: other }),
      );
      expect(
        await asUser(tx, me, (utx) => utx.select().from(discoverPreferences)),
      ).toHaveLength(0);
      // Update e delete de linha alheia não acham nada.
      const updated = await asUser(tx, me, (utx) =>
        utx
          .update(discoverPreferences)
          .set({ hiddenIds: ["trending"] })
          .where(eq(discoverPreferences.userId, other))
          .returning(),
      );
      expect(updated).toHaveLength(0);
      const deleted = await asUser(tx, me, (utx) =>
        utx
          .delete(discoverPreferences)
          .where(eq(discoverPreferences.userId, other))
          .returning(),
      );
      expect(deleted).toHaveLength(0);
    }));

  it("uma linha por usuário", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      await asUser(tx, me, (utx) =>
        utx.insert(discoverPreferences).values({ userId: me }),
      );
      await expect(
        asUser(tx, me, (utx) =>
          utx.insert(discoverPreferences).values({ userId: me }),
        ),
      ).rejects.toEqual(pgError(UNIQUE_VIOLATION));
    }));

  it("limita o tamanho das listas", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      const tooMany = Array.from({ length: 51 }, (_, i) => `lista_${i}`);
      await expect(
        asUser(tx, me, (utx) =>
          utx
            .insert(discoverPreferences)
            .values({ userId: me, orderIds: tooMany }),
        ),
      ).rejects.toEqual(pgError(CHECK_VIOLATION));
    }));

  it("apagar o perfil apaga a preferência (cascata)", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      await asUser(tx, me, (utx) =>
        utx.insert(discoverPreferences).values({ userId: me }),
      );
      await tx.delete(profiles).where(eq(profiles.id, me));
      expect(
        await tx
          .select()
          .from(discoverPreferences)
          .where(eq(discoverPreferences.userId, me)),
      ).toHaveLength(0);
    }));
});
