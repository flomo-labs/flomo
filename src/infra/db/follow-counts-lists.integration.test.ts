import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { createFollowRepository } from "./follow-repository";
import { follows, profiles } from "./schema";

// Exercita a migration 0023: contagens (visíveis a qualquer logado, só
// `accepted`) e listas de seguidores e de seguindo (perfil público: qualquer logado;
// privado: só o dono e o seguidor aceito).
afterAll(closeTestDb);

const INSUFFICIENT_PRIVILEGE = "42501";
const PAGE = { limit: 30, offset: 0 };

async function person(tx: Tx, isPrivate: boolean) {
  const id = await createUser(tx, { full_name: "Pessoa de Teste" });
  const handle = `t${id.replaceAll("-", "").slice(0, 12)}`;
  await tx
    .update(profiles)
    .set({ handle, isPrivate })
    .where(eq(profiles.id, id));
  return { id, handle };
}

// Dono privado `owner`: `accepted` o segue (aceito), `pending` pediu e espera;
// `owner` segue `followed` (público). `stranger` não tem vínculo.
async function scene(tx: Tx) {
  const owner = await person(tx, true);
  const accepted = await person(tx, true);
  const pending = await person(tx, false);
  const followed = await person(tx, false);
  const stranger = await person(tx, false);
  await tx.insert(follows).values([
    {
      followerId: accepted.id,
      followeeId: owner.id,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
    { followerId: pending.id, followeeId: owner.id },
    { followerId: owner.id, followeeId: followed.id },
  ]);
  await tx
    .update(follows)
    .set({ status: "accepted" })
    .where(eq(follows.followerId, accepted.id));
  return { owner, accepted, pending, followed, stranger };
}

describe("contagens e listas de seguidores (migration 0023)", () => {
  it("a contagem conta só aceitos e qualquer logado a vê, inclusive de perfil privado", () =>
    inRollback(async (tx) => {
      const s = await scene(tx);
      for (const viewer of [s.owner, s.accepted, s.pending, s.stranger]) {
        const counts = await asUser(tx, viewer.id, (t) =>
          createFollowRepository(t).counts(s.owner.id),
        );
        expect(counts).toEqual({ followers: 1, following: 1 });
      }
    }));

  it("perfil inexistente não tem contagem", () =>
    inRollback(async (tx) => {
      const s = await scene(tx);
      const counts = await asUser(tx, s.owner.id, (t) =>
        createFollowRepository(t).counts(
          "00000000-0000-4000-8000-000000000000",
        ),
      );
      expect(counts).toBeNull();
    }));

  it("o dono e o seguidor aceito veem as duas listas, sem pendentes", () =>
    inRollback(async (tx) => {
      const s = await scene(tx);
      for (const viewer of [s.owner, s.accepted]) {
        const repo = (t: Tx) => createFollowRepository(t);
        const followers = await asUser(tx, viewer.id, (t) =>
          repo(t).listFollowers(s.owner.id, PAGE),
        );
        expect(followers.map((p) => p.profileId)).toEqual([s.accepted.id]);
        expect(followers[0]).toMatchObject({
          handle: s.accepted.handle,
          displayName: "Pessoa de Teste",
        });
        const following = await asUser(tx, viewer.id, (t) =>
          repo(t).listFollowing(s.owner.id, PAGE),
        );
        expect(following.map((p) => p.profileId)).toEqual([s.followed.id]);
      }
    }));

  it("pendente e estranho recebem listas vazias", () =>
    inRollback(async (tx) => {
      const s = await scene(tx);
      for (const viewer of [s.pending, s.stranger]) {
        const repo = (t: Tx) => createFollowRepository(t);
        expect(
          await asUser(tx, viewer.id, (t) =>
            repo(t).listFollowers(s.owner.id, PAGE),
          ),
        ).toEqual([]);
        expect(
          await asUser(tx, viewer.id, (t) =>
            repo(t).listFollowing(s.owner.id, PAGE),
          ),
        ).toEqual([]);
      }
    }));

  it("perfil público: qualquer logado vê a lista; perfil inexistente, não", () =>
    inRollback(async (tx) => {
      const s = await scene(tx);
      const asStranger = await asUser(tx, s.stranger.id, (t) =>
        createFollowRepository(t).listFollowers(s.followed.id, PAGE),
      );
      expect(asStranger.map((p) => p.profileId)).toEqual([s.owner.id]);
      const missing = await asUser(tx, s.stranger.id, (t) =>
        createFollowRepository(t).listFollowers(
          "00000000-0000-4000-8000-000000000000",
          PAGE,
        ),
      );
      expect(missing).toEqual([]);
    }));

  it("mais recentes primeiro e paginação", () =>
    inRollback(async (tx) => {
      const s = await scene(tx);
      await tx
        .update(follows)
        .set({
          status: "accepted",
          createdAt: new Date("2026-02-01T00:00:00Z"),
        })
        .where(eq(follows.followerId, s.pending.id));
      const repo = (t: Tx) => createFollowRepository(t);
      const all = await asUser(tx, s.owner.id, (t) =>
        repo(t).listFollowers(s.owner.id, PAGE),
      );
      expect(all.map((p) => p.profileId)).toEqual([
        s.pending.id,
        s.accepted.id,
      ]);
      const second = await asUser(tx, s.owner.id, (t) =>
        repo(t).listFollowers(s.owner.id, { limit: 1, offset: 1 }),
      );
      expect(second.map((p) => p.profileId)).toEqual([s.accepted.id]);
    }));

  it("anon não chama as funções, e ninguém chama o apoio de visibilidade", () =>
    inRollback(async (tx) => {
      const s = await scene(tx);
      for (const query of [
        sql`select * from app.follow_counts(${s.owner.id}::uuid)`,
        sql`select * from app.followers_of(${s.owner.id}::uuid)`,
        sql`select * from app.following_of(${s.owner.id}::uuid)`,
      ]) {
        await expect(
          tx.transaction(async (sp) => {
            await sp.execute(sql`set local role anon`);
            await sp.execute(query);
          }),
        ).rejects.toEqual(
          expect.objectContaining({
            cause: expect.objectContaining({ code: INSUFFICIENT_PRIVILEGE }),
          }),
        );
      }
      await expect(
        asUser(tx, s.owner.id, (t) =>
          t.transaction(async (sp) =>
            sp.execute(
              sql`select app.follow_list_visible(${s.owner.id}::uuid)`,
            ),
          ),
        ),
      ).rejects.toEqual(
        expect.objectContaining({
          cause: expect.objectContaining({ code: INSUFFICIENT_PRIVILEGE }),
        }),
      );
    }));

  it("relationsWith diz como o usuário logado se liga a cada pessoa da lista", () =>
    inRollback(async (tx) => {
      const s = await scene(tx);
      // `accepted` segue o dono (aceito); o dono segue `followed`; `pending`
      // pediu para seguir o dono.
      const ids = [s.accepted.id, s.pending.id, s.followed.id, s.stranger.id];
      const fromOwner = await asUser(tx, s.owner.id, (t) =>
        createFollowRepository(t).relationsWith(s.owner.id, ids),
      );
      expect(fromOwner).toEqual([
        { profileId: s.accepted.id, following: null, followsViewer: true },
        { profileId: s.pending.id, following: null, followsViewer: false },
        {
          profileId: s.followed.id,
          following: "accepted",
          followsViewer: false,
        },
        { profileId: s.stranger.id, following: null, followsViewer: false },
      ]);
      expect(
        await asUser(tx, s.owner.id, (t) =>
          createFollowRepository(t).relationsWith(s.owner.id, []),
        ),
      ).toEqual([]);
    }));
});
