import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  acceptFollowRequest,
  declineFollowRequest,
  followUser,
  unfollowUser,
} from "@/domain/follow/follow";
import type { Tx } from "./client";
import { createFollowRepository } from "./follow-repository";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { follows, profiles } from "./schema";

// Casos de uso de seguir contra o banco de teste, pelo mesmo caminho da
// borda: repositório dentro do `withUser`, sob RLS e gatilhos da 0021.
afterAll(closeTestDb);

async function createPerson(tx: Tx, isPrivate: boolean) {
  const id = await createUser(tx);
  await tx.update(profiles).set({ isPrivate }).where(eq(profiles.id, id));
  return { id };
}

function run<T>(tx: Tx, userId: string, fn: Parameters<typeof asUser<T>>[2]) {
  return asUser(tx, userId, fn);
}

const deps = (tx: Tx) => ({ follows: createFollowRepository(tx) });

describe("seguir contra o banco", () => {
  it("perfil público: segue direto; seguir de novo mantém uma linha", () =>
    inRollback(async (tx) => {
      const owner = await createPerson(tx, false);
      const me = await createUser(tx);
      const input = { profileId: owner.id };
      const first = await run(tx, me, (t) =>
        followUser(deps(t), { id: me }, input),
      );
      const again = await run(tx, me, (t) =>
        followUser(deps(t), { id: me }, input),
      );
      expect(first).toEqual({ ok: true, value: { status: "accepted" } });
      expect(again).toEqual(first);
      expect(await tx.select().from(follows)).toHaveLength(1);
    }));

  it("perfil privado: solicita; o dono aceita e quem pediu passa a seguir", () =>
    inRollback(async (tx) => {
      const owner = await createPerson(tx, true);
      const me = await createUser(tx);
      expect(
        await run(tx, me, (t) =>
          followUser(deps(t), { id: me }, { profileId: owner.id }),
        ),
      ).toEqual({ ok: true, value: { status: "requested" } });
      expect(
        await run(tx, owner.id, (t) =>
          acceptFollowRequest(deps(t), { id: owner.id }, { followerId: me }),
        ),
      ).toMatchObject({ ok: true });
      const [row] = await tx.select().from(follows);
      expect(row.status).toBe("accepted");
      // Aceitar de novo (duplo clique) não é erro.
      expect(
        await run(tx, owner.id, (t) =>
          acceptFollowRequest(deps(t), { id: owner.id }, { followerId: me }),
        ),
      ).toMatchObject({ ok: true });
    }));

  it("recusar apaga a solicitação e dá para pedir de novo; seguidor aceito não sai por recusar", () =>
    inRollback(async (tx) => {
      const owner = await createPerson(tx, true);
      const me = await createUser(tx);
      const follow = () =>
        run(tx, me, (t) =>
          followUser(deps(t), { id: me }, { profileId: owner.id }),
        );
      const decline = () =>
        run(tx, owner.id, (t) =>
          declineFollowRequest(deps(t), { id: owner.id }, { followerId: me }),
        );
      await follow();
      await decline();
      expect(await tx.select().from(follows)).toHaveLength(0);
      expect(await follow()).toMatchObject({ value: { status: "requested" } });
      await run(tx, owner.id, (t) =>
        acceptFollowRequest(deps(t), { id: owner.id }, { followerId: me }),
      );
      await decline();
      expect(await tx.select().from(follows)).toHaveLength(1);
    }));

  it("só o seguido aceita: o próprio solicitante e estranhos não conseguem", () =>
    inRollback(async (tx) => {
      const owner = await createPerson(tx, true);
      const me = await createUser(tx);
      const stranger = await createUser(tx);
      await run(tx, me, (t) =>
        followUser(deps(t), { id: me }, { profileId: owner.id }),
      );
      for (const actor of [me, stranger]) {
        expect(
          await run(tx, actor, (t) =>
            acceptFollowRequest(deps(t), { id: actor }, { followerId: me }),
          ),
        ).toMatchObject({ error: { code: "REQUEST_NOT_FOUND" } });
      }
      const [row] = await tx.select().from(follows);
      expect(row.status).toBe("requested");
    }));

  it("deixar de seguir e cancelar a solicitação apagam só o vínculo de quem desfaz", () =>
    inRollback(async (tx) => {
      const pub = await createPerson(tx, false);
      const priv = await createPerson(tx, true);
      const me = await createUser(tx);
      const other = await createUser(tx);
      for (const target of [pub.id, priv.id]) {
        await run(tx, me, (t) =>
          followUser(deps(t), { id: me }, { profileId: target }),
        );
      }
      await run(tx, other, (t) =>
        followUser(deps(t), { id: other }, { profileId: pub.id }),
      );
      for (const target of [pub.id, priv.id]) {
        expect(
          await run(tx, me, (t) =>
            unfollowUser(deps(t), { id: me }, { profileId: target }),
          ),
        ).toMatchObject({ ok: true });
      }
      const rows = await tx.select().from(follows);
      expect(rows).toEqual([expect.objectContaining({ followerId: other })]);
    }));

  it("perfil inexistente e seguir a si mesmo voltam como erro de caso de uso", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      expect(
        await run(tx, me, (t) =>
          followUser(deps(t), { id: me }, { profileId: randomUUID() }),
        ),
      ).toMatchObject({ error: { code: "PROFILE_NOT_FOUND" } });
      expect(
        await run(tx, me, (t) =>
          followUser(deps(t), { id: me }, { profileId: me }),
        ),
      ).toMatchObject({ error: { code: "CANNOT_FOLLOW_SELF" } });
    }));
});
