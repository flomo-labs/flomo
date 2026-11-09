import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { follows, profiles } from "./schema";

// Exercita a migration 0022: app.pending_follow_requests devolve ao seguido as
// solicitações `requested` com nome, handle e foto de quem pediu, mesmo que o
// perfil de quem pediu seja privado (a policy de profiles o esconderia).
afterAll(closeTestDb);

const INSUFFICIENT_PRIVILEGE = "42501";

type Row = {
  follower_id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
};

function pendingOf(tx: Tx) {
  return tx.execute<Row>(
    sql`select follower_id, handle, display_name, avatar_url
        from app.pending_follow_requests()`,
  );
}

async function createProfile(tx: Tx, isPrivate: boolean) {
  const id = await createUser(tx, {
    full_name: "Pessoa de Teste",
    avatar_url: "https://exemplo.invalid/foto.png",
  });
  const handle = `t${id.replaceAll("-", "").slice(0, 12)}`;
  await tx
    .update(profiles)
    .set({ handle, isPrivate })
    .where(eq(profiles.id, id));
  return { id, handle };
}

describe("app.pending_follow_requests", () => {
  it("devolve a solicitação pendente, com os dados de quem pediu (perfil privado inclusive)", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const asker = await createProfile(tx, true);
      await tx
        .insert(follows)
        .values({ followerId: asker.id, followeeId: owner.id });
      const rows = await asUser(tx, owner.id, pendingOf);
      expect([...rows]).toEqual([
        {
          follower_id: asker.id,
          handle: asker.handle,
          display_name: "Pessoa de Teste",
          avatar_url: "https://exemplo.invalid/foto.png",
        },
      ]);
    }));

  it("não lista quem já foi aceito, nem quem o dono pediu para seguir", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const accepted = await createProfile(tx, false);
      const pending = await createProfile(tx, false);
      const other = await createProfile(tx, true);
      await tx.insert(follows).values([
        { followerId: accepted.id, followeeId: owner.id },
        { followerId: pending.id, followeeId: owner.id },
        { followerId: owner.id, followeeId: other.id },
      ]);
      // O gatilho dá `requested` a quem pede perfil privado; aceita um deles.
      await tx
        .update(follows)
        .set({ status: "accepted" })
        .where(eq(follows.followerId, accepted.id));
      const rows = await asUser(tx, owner.id, pendingOf);
      expect([...rows].map((r) => r.follower_id)).toEqual([pending.id]);
    }));

  it("estranho não vê as solicitações de outro dono", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const asker = await createProfile(tx, false);
      const stranger = await createProfile(tx, false);
      await tx
        .insert(follows)
        .values({ followerId: asker.id, followeeId: owner.id });
      expect([...(await asUser(tx, stranger.id, pendingOf))]).toEqual([]);
      // Nem quem pediu enxerga a própria solicitação por aqui.
      expect([...(await asUser(tx, asker.id, pendingOf))]).toEqual([]);
    }));

  it("mais recentes primeiro", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const first = await createProfile(tx, false);
      const second = await createProfile(tx, false);
      await tx.insert(follows).values({
        followerId: first.id,
        followeeId: owner.id,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      });
      await tx.insert(follows).values({
        followerId: second.id,
        followeeId: owner.id,
        createdAt: new Date("2026-02-01T00:00:00Z"),
      });
      const rows = await asUser(tx, owner.id, pendingOf);
      expect([...rows].map((r) => r.follower_id)).toEqual([
        second.id,
        first.id,
      ]);
    }));

  it("anon não pode chamar a função", () =>
    inRollback(async (tx) => {
      await expect(
        tx.transaction(async (sp) => {
          await sp.execute(sql`set local role anon`);
          await pendingOf(sp);
        }),
      ).rejects.toEqual(
        expect.objectContaining({
          cause: expect.objectContaining({ code: INSUFFICIENT_PRIVILEGE }),
        }),
      );
    }));
});
