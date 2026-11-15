import { eq, inArray, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  acceptFollowRequest,
  declineFollowRequest,
  followUser,
  listFollowRequests,
  removeFollower,
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

// Só as linhas das pessoas criadas no teste: o flomo-dev pode ter linhas
// residuais de uso manual, e a tabela inteira não é um estado conhecido.
function followRows(tx: Tx, ...personIds: string[]) {
  return tx
    .select()
    .from(follows)
    .where(
      or(
        inArray(follows.followerId, personIds),
        inArray(follows.followeeId, personIds),
      ),
    );
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
      expect(await followRows(tx, me, owner.id)).toHaveLength(1);
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
      const [row] = await followRows(tx, me, owner.id);
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
      expect(await followRows(tx, me, owner.id)).toHaveLength(0);
      expect(await follow()).toMatchObject({ value: { status: "requested" } });
      await run(tx, owner.id, (t) =>
        acceptFollowRequest(deps(t), { id: owner.id }, { followerId: me }),
      );
      await decline();
      expect(await followRows(tx, me, owner.id)).toHaveLength(1);
    }));

  it("remover seguidor: o dono remove; terceiro não; pendente fica; o ex-seguidor segue de novo", () =>
    inRollback(async (tx) => {
      const owner = await createPerson(tx, true);
      const me = await createUser(tx);
      const stranger = await createUser(tx);
      await run(tx, me, (t) =>
        followUser(deps(t), { id: me }, { profileId: owner.id }),
      );
      const remove = (by: string, followerId = me) =>
        run(tx, by, (t) =>
          removeFollower(deps(t), { id: by }, { followerId }),
        );
      // Pendente não é seguidor: nada some.
      expect(await remove(owner.id)).toMatchObject({
        value: { removed: false },
      });
      expect(await followRows(tx, me, owner.id)).toHaveLength(1);
      await run(tx, owner.id, (t) =>
        acceptFollowRequest(deps(t), { id: owner.id }, { followerId: me }),
      );
      // Terceiro tenta remover o seguidor do dono: não apaga nada.
      expect(await remove(stranger)).toMatchObject({
        value: { removed: false },
      });
      expect(await followRows(tx, me, owner.id)).toHaveLength(1);
      // O próprio seguidor não se remove por aqui (é o "deixar de seguir").
      expect(await remove(me, owner.id)).toMatchObject({
        value: { removed: false },
      });
      expect(await followRows(tx, me, owner.id)).toHaveLength(1);
      expect(await remove(owner.id)).toMatchObject({
        value: { removed: true },
      });
      expect(await followRows(tx, me, owner.id)).toHaveLength(0);
      expect(await remove(owner.id)).toMatchObject({
        value: { removed: false },
      });
      // O ex-seguidor volta a pedir (perfil privado: solicitação).
      expect(
        await run(tx, me, (t) =>
          followUser(deps(t), { id: me }, { profileId: owner.id }),
        ),
      ).toMatchObject({ value: { status: "requested" } });
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
      const [row] = await followRows(tx, me, owner.id);
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
      const rows = await followRows(tx, me, other, pub.id, priv.id);
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

  it("lista as solicitações pendentes: quem pediu com perfil privado aparece", () =>
    inRollback(async (tx) => {
      const owner = await createPerson(tx, true);
      const asker = await createPerson(tx, true);
      await run(tx, asker.id, (t) =>
        followUser(deps(t), { id: asker.id }, { profileId: owner.id }),
      );
      const result = await run(tx, owner.id, (t) =>
        listFollowRequests(deps(t), { id: owner.id }),
      );
      expect(result.ok && result.value.requests).toMatchObject([
        { followerId: asker.id },
      ]);
    }));

  it("estranho não vê as solicitações de outro dono; aceitar tira da lista", () =>
    inRollback(async (tx) => {
      const owner = await createPerson(tx, true);
      const asker = await createPerson(tx, false);
      const stranger = await createUser(tx);
      await run(tx, asker.id, (t) =>
        followUser(deps(t), { id: asker.id }, { profileId: owner.id }),
      );
      const seen = (id: string) =>
        run(tx, id, async (t) => {
          const r = await listFollowRequests(deps(t), { id });
          return r.ok ? r.value.requests.map((x) => x.followerId) : [];
        });
      expect(await seen(stranger)).toEqual([]);
      expect(await seen(owner.id)).toEqual([asker.id]);
      await run(tx, owner.id, (t) =>
        acceptFollowRequest(
          deps(t),
          { id: owner.id },
          { followerId: asker.id },
        ),
      );
      expect(await seen(owner.id)).toEqual([]);
    }));
});
