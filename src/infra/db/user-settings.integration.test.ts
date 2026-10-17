import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { userSettings } from "./schema";
import { createSettingsRepository } from "./settings-repository";
import { getStartScreen, setStartScreen } from "@/domain/profile/start-screen";

afterAll(closeTestDb);

describe("preferências do usuário no banco", () => {
  it("o dono grava e lê a própria tela inicial; o padrão é a Home", () =>
    inRollback(async (tx) => {
      const id = await createUser(tx);
      await asUser(tx, id, (utx) =>
        utx.insert(userSettings).values({ userId: id }),
      );
      const [row] = await asUser(tx, id, (utx) =>
        utx.select().from(userSettings).where(eq(userSettings.userId, id)),
      );
      expect(row.startScreen).toBe("home");

      await asUser(tx, id, (utx) =>
        utx
          .update(userSettings)
          .set({ startScreen: "following" })
          .where(eq(userSettings.userId, id)),
      );
      const [changed] = await asUser(tx, id, (utx) =>
        utx.select().from(userSettings).where(eq(userSettings.userId, id)),
      );
      expect(changed.startScreen).toBe("following");
    }));

  it("ninguém lê nem grava a preferência de outro usuário", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      await asUser(tx, owner, (utx) =>
        utx
          .insert(userSettings)
          .values({ userId: owner, startScreen: "following" }),
      );

      const seen = await asUser(tx, other, (utx) =>
        utx.select().from(userSettings),
      );
      expect(seen).toEqual([]);

      await expect(
        asUser(tx, other, (utx) =>
          utx.insert(userSettings).values({ userId: owner }),
        ),
      ).rejects.toThrow();
    }));

  it("recusa uma tela inicial desconhecida", () =>
    inRollback(async (tx) => {
      const id = await createUser(tx);
      await expect(
        tx.insert(userSettings).values({ userId: id, startScreen: "outra" }),
      ).rejects.toThrow();
    }));

  it("o caso de uso grava, troca e lê de volta (upsert)", () =>
    inRollback(async (tx) => {
      const id = await createUser(tx);
      const deps = (utx: Parameters<typeof createSettingsRepository>[0]) => ({
        settings: createSettingsRepository(utx),
      });

      expect(
        await asUser(tx, id, (utx) => getStartScreen(deps(utx), { id })),
      ).toEqual({ ok: true, value: "home" });

      for (const startScreen of ["following", "home", "following"] as const) {
        await asUser(tx, id, (utx) =>
          setStartScreen(deps(utx), { id }, { startScreen }),
        );
        expect(
          await asUser(tx, id, (utx) => getStartScreen(deps(utx), { id })),
        ).toEqual({ ok: true, value: startScreen });
      }
    }));
});
