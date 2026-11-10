import { afterAll, describe, expect, it } from "vitest";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { createBlockRepository } from "./block-repository";

// Repositório de bloqueios sobre a migration 0024.
afterAll(closeTestDb);

describe("createBlockRepository", () => {
  it("bloqueia, consulta, lista e desbloqueia", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx, { full_name: "Eu" });
      const them = await createUser(tx, { full_name: "Fulana" });
      await asUser(tx, me, async (utx) => {
        const repo = createBlockRepository(utx);
        expect(await repo.exists(me, them)).toBe(false);
        expect(await repo.insert(me, them)).toBe("ok");
        expect(await repo.insert(me, them)).toBe("ok"); // duplo clique
        expect(await repo.exists(me, them)).toBe(true);
        const list = await repo.list(me);
        expect(list.map((p) => p.profileId)).toEqual([them]);
        await repo.delete(me, them);
        expect(await repo.exists(me, them)).toBe(false);
        expect(await repo.list(me)).toEqual([]);
      });
    }));

  it("pessoa inexistente vira not_found e a transação segue utilizável", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      await asUser(tx, me, async (utx) => {
        const repo = createBlockRepository(utx);
        expect(
          await repo.insert(me, "00000000-0000-4000-8000-000000000000"),
        ).toBe("not_found");
        expect(await repo.exists(me, me)).toBe(false);
      });
    }));
});
