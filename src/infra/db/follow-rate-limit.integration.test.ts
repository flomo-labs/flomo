import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { followUser, unfollowUser } from "@/domain/follow/follow";
import { withUser, type Tx } from "./client";
import { createFollowRepository } from "./follow-repository";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
  setFollowLimits,
} from "./integration-test-utils";
import { followAttempts, follows } from "./schema";

// Limite de volume de pedidos de seguir (migration 0025, #295): o gatilho
// `follows_rate_limit` conta cada vínculo criado, inclusive no ciclo seguir e
// desfazer, e recusa o que passa do limite.
afterAll(closeTestDb);

const deps = (tx: Tx) => ({ follows: createFollowRepository(tx) });

const follow = (tx: Tx, me: string, target: string) =>
  asUser(tx, me, (t) => followUser(deps(t), { id: me }, { profileId: target }));
const unfollow = (tx: Tx, me: string, target: string) =>
  asUser(tx, me, (t) =>
    unfollowUser(deps(t), { id: me }, { profileId: target }),
  );

async function people(tx: Tx, count: number) {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) ids.push(await createUser(tx));
  return ids;
}

describe("limite de pedidos de seguir no banco", () => {
  it("abaixo do limite segue; acima, recusa com RATE_LIMITED e nada é criado", () =>
    inRollback(async (tx) => {
      await setFollowLimits(tx, [[3600, 2]]);
      const [me, a, b, c] = await people(tx, 4);
      expect(await follow(tx, me, a)).toMatchObject({ ok: true });
      expect(await follow(tx, me, b)).toMatchObject({ ok: true });
      expect(await follow(tx, me, c)).toMatchObject({
        error: { code: "RATE_LIMITED" },
      });
      expect(
        await tx.select().from(follows).where(eq(follows.followerId, me)),
      ).toHaveLength(2);
    }));

  it("seguir de novo quem já se segue não gasta limite", () =>
    inRollback(async (tx) => {
      await setFollowLimits(tx, [[3600, 1]]);
      const [me, a] = await people(tx, 2);
      await follow(tx, me, a);
      expect(await follow(tx, me, a)).toMatchObject({ ok: true });
      expect(await tx.select().from(followAttempts)).toHaveLength(1);
    }));

  it("seguir e desfazer em ciclo também conta", () =>
    inRollback(async (tx) => {
      await setFollowLimits(tx, [[3600, 2]]);
      const [me, a] = await people(tx, 2);
      for (let i = 0; i < 2; i++) {
        await follow(tx, me, a);
        await unfollow(tx, me, a);
      }
      expect(await follow(tx, me, a)).toMatchObject({
        error: { code: "RATE_LIMITED" },
      });
    }));

  it("cada pessoa tem o próprio limite", () =>
    inRollback(async (tx) => {
      await setFollowLimits(tx, [[3600, 1]]);
      const [me, other, a, b] = await people(tx, 4);
      await follow(tx, me, a);
      expect(await follow(tx, me, b)).toMatchObject({ ok: false });
      expect(await follow(tx, other, b)).toMatchObject({ ok: true });
    }));

  it("com duas janelas, vale a mais restrita", () =>
    inRollback(async (tx) => {
      await setFollowLimits(tx, [
        [3600, 5],
        [86400, 2],
      ]);
      const [me, a, b, c] = await people(tx, 4);
      await follow(tx, me, a);
      await follow(tx, me, b);
      expect(await follow(tx, me, c)).toMatchObject({
        error: { code: "RATE_LIMITED" },
      });
    }));

  it("registros fora da janela deixam de contar e são apagados", () =>
    inRollback(async (tx) => {
      await setFollowLimits(tx, [[3600, 1]]);
      const [me, a, b] = await people(tx, 3);
      await follow(tx, me, a);
      await tx.execute(
        sql`update public.follow_attempts set created_at = now() - interval '2 hours'`,
      );
      expect(await follow(tx, me, b)).toMatchObject({ ok: true });
      expect(await tx.select().from(followAttempts)).toHaveLength(1);
    }));

  it("sem configuração, criar vínculo falha com erro claro (falha fechada)", () =>
    inRollback(async (tx) => {
      const [me, a] = await people(tx, 2);
      await setFollowLimits(tx, []);
      // Sem `asUser` de propósito: ele repõe uma configuração de folga.
      await expect(
        withUser(
          { sub: me, role: "authenticated" },
          (t) => followUser(deps(t), { id: me }, { profileId: a }),
          tx,
        ),
      ).rejects.toThrow(/follow_limits/);
    }));

  it("o cliente não lê nem altera a configuração nem os registros", () =>
    inRollback(async (tx) => {
      await setFollowLimits(tx, [[3600, 5]]);
      const [me] = await people(tx, 1);
      await expect(
        asUser(tx, me, (t) =>
          t.execute(sql`select * from public.follow_limits`),
        ),
      ).rejects.toMatchObject({ cause: { code: "42501" } });
    }));

  it("operações administrativas (papel postgres) não são limitadas", () =>
    inRollback(async (tx) => {
      await setFollowLimits(tx, [[3600, 1]]);
      const [a, b, c] = await people(tx, 3);
      await tx.insert(follows).values({ followerId: a, followeeId: b });
      await tx.insert(follows).values({ followerId: a, followeeId: c });
      expect(await tx.select().from(followAttempts)).toHaveLength(0);
    }));
});
