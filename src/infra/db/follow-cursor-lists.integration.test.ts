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

// Exercita a migration 0028: `app.followers_of` e `app.following_of` com
// cursor (data do vínculo + id), no lugar do `offset` (#361).
afterAll(closeTestDb);

type Row = { profile_id: string; cursor_at: string };

async function person(tx: Tx) {
  const id = await createUser(tx, { full_name: "Pessoa de Teste" });
  const handle = `t${id.replaceAll("-", "").slice(0, 12)}`;
  await tx.update(profiles).set({ handle }).where(eq(profiles.id, id));
  return id;
}

// Vínculo aceito com data exata, em microssegundos (o `Date` do JS só tem
// milissegundos).
async function follow(
  tx: Tx,
  followerId: string,
  followeeId: string,
  at: string,
) {
  await tx.insert(follows).values({ followerId, followeeId });
  await tx.execute(
    sql`update public.follows set status = 'accepted', created_at = ${at}::timestamptz
        where follower_id = ${followerId}::uuid and followee_id = ${followeeId}::uuid`,
  );
}

async function page(
  tx: Tx,
  viewer: string,
  fn: "followers_of" | "following_of",
  profileId: string,
  limit: number,
  after: { at: string; id: string } | null,
): Promise<Row[]> {
  return asUser(tx, viewer, async (t) => {
    const rows = await t.execute<Row>(
      sql`select * from app.${sql.identifier(fn)}(
        ${profileId}::uuid, ${limit}::integer,
        ${after?.at ?? null}::timestamptz, ${after?.id ?? null}::uuid)`,
    );
    return [...rows];
  });
}

const next = (rows: Row[]) => {
  const last = rows[rows.length - 1]!;
  return { at: last.cursor_at, id: last.profile_id };
};

describe("listas por cursor (migration 0028)", () => {
  it("percorre tudo, na ordem, sem pular nem repetir, inclusive com data igual e microssegundos", () =>
    inRollback(async (tx) => {
      const owner = await person(tx);
      const fans = [];
      for (let i = 0; i < 7; i++) fans.push(await person(tx));
      // Três com a mesma data e duas que só diferem nos microssegundos.
      const dates = [
        "2026-03-01T10:00:00.000000Z",
        "2026-03-01T10:00:00.000000Z",
        "2026-03-01T10:00:00.000000Z",
        "2026-02-01T10:00:00.000001Z",
        "2026-02-01T10:00:00.000002Z",
        "2026-01-01T10:00:00Z",
        "2026-01-01T09:00:00Z",
      ];
      for (let i = 0; i < fans.length; i++) {
        await follow(tx, fans[i]!, owner, dates[i]!);
      }
      const all = await page(tx, owner, "followers_of", owner, 100, null);
      expect(all).toHaveLength(7);
      expect(all[3]!.cursor_at).toBe("2026-02-01T10:00:00.000002Z");

      const seen: string[] = [];
      let after: { at: string; id: string } | null = null;
      for (;;) {
        const rows: Row[] = await page(
          tx,
          owner,
          "followers_of",
          owner,
          2,
          after,
        );
        if (rows.length === 0) break;
        seen.push(...rows.map((r) => r.profile_id));
        after = next(rows);
      }
      expect(seen).toEqual(all.map((r) => r.profile_id));
    }));

  it("novo vínculo ou remoção de terceiros entre as páginas não pula nem repete", () =>
    inRollback(async (tx) => {
      const owner = await person(tx);
      const fans = [];
      for (let i = 0; i < 6; i++) fans.push(await person(tx));
      for (let i = 0; i < fans.length; i++) {
        await follow(tx, fans[i]!, owner, `2026-01-0${i + 1}T00:00:00Z`);
      }
      // Ordem: fans[5], [4], [3], [2], [1], [0].
      const first = await page(tx, owner, "followers_of", owner, 2, null);
      expect(first.map((r) => r.profile_id)).toEqual([fans[5], fans[4]]);

      // Entre as páginas: alguém novo segue (vai para o topo) e quem já foi
      // entregue deixa de seguir.
      const newcomer = await person(tx);
      await follow(tx, newcomer, owner, "2026-02-01T00:00:00Z");
      await tx.delete(follows).where(eq(follows.followerId, fans[5]!));

      const second = await page(
        tx,
        owner,
        "followers_of",
        owner,
        2,
        next(first),
      );
      expect(second.map((r) => r.profile_id)).toEqual([fans[3], fans[2]]);
      const third = await page(
        tx,
        owner,
        "followers_of",
        owner,
        10,
        next(second),
      );
      expect(third.map((r) => r.profile_id)).toEqual([fans[1], fans[0]]);
    }));

  it("a lista de seguindo também pagina por cursor", () =>
    inRollback(async (tx) => {
      const owner = await person(tx);
      const targets = [];
      for (let i = 0; i < 3; i++) targets.push(await person(tx));
      for (let i = 0; i < targets.length; i++) {
        await follow(tx, owner, targets[i]!, `2026-01-0${i + 1}T00:00:00Z`);
      }
      const first = await page(tx, owner, "following_of", owner, 2, null);
      expect(first.map((r) => r.profile_id)).toEqual([targets[2], targets[1]]);
      const second = await page(
        tx,
        owner,
        "following_of",
        owner,
        2,
        next(first),
      );
      expect(second.map((r) => r.profile_id)).toEqual([targets[0]]);
    }));

  it("mantém as regras de visibilidade: perfil privado some para quem não segue", () =>
    inRollback(async (tx) => {
      const owner = await person(tx);
      const fan = await person(tx);
      const stranger = await person(tx);
      await tx
        .update(profiles)
        .set({ isPrivate: true })
        .where(eq(profiles.id, owner));
      await follow(tx, fan, owner, "2026-01-01T00:00:00Z");
      expect(await page(tx, stranger, "followers_of", owner, 10, null)).toEqual(
        [],
      );
      expect(
        await page(tx, owner, "followers_of", owner, 10, null),
      ).toHaveLength(1);
    }));
});
