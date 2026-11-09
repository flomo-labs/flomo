import { and, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { follows, profiles } from "./schema";

// Exercita a migration 0021: tabela `follows` (estado, RLS, permissões por
// coluna) e o que app.profile_card e app.profile_stats passam a mostrar a
// quem foi aceito.
afterAll(closeTestDb);

const INSUFFICIENT_PRIVILEGE = "42501";
const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

function pgError(code: string) {
  return expect.objectContaining({
    cause: expect.objectContaining({ code }),
  });
}

async function createProfile(tx: Tx, isPrivate: boolean) {
  const id = await createUser(tx, { full_name: "Pessoa de Teste" });
  const handle = `t${id.replaceAll("-", "").slice(0, 12)}`;
  await tx
    .update(profiles)
    .set({ handle, bio: "Minha bio", isPrivate })
    .where(eq(profiles.id, id));
  return { id, handle };
}

function follow(tx: Tx, followerId: string, followeeId: string) {
  return tx.insert(follows).values({ followerId, followeeId });
}

function statusOf(tx: Tx, followerId: string, followeeId: string) {
  return tx
    .select({ status: follows.status })
    .from(follows)
    .where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followeeId, followeeId),
      ),
    );
}

function cardOf(tx: Tx, handle: string) {
  return tx.execute<{ bio: string | null; can_see_details: boolean }>(
    sql`select bio, can_see_details from app.profile_card(${handle})`,
  );
}

function statsOf(tx: Tx, profileId: string) {
  return tx.execute(sql`select * from app.profile_stats(${profileId}::uuid)`);
}

describe("follows: estado de nascimento", () => {
  it("perfil público: segue direto (accepted)", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, false);
      const me = await createUser(tx);
      await asUser(tx, me, (utx) => follow(utx, me, owner.id));
      expect(await statusOf(tx, me, owner.id)).toEqual([
        { status: "accepted" },
      ]);
    }));

  it("perfil privado: vira solicitação (requested)", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const me = await createUser(tx);
      await asUser(tx, me, (utx) => follow(utx, me, owner.id));
      expect(await statusOf(tx, me, owner.id)).toEqual([
        { status: "requested" },
      ]);
    }));

  it("o cliente não escolhe o estado", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const me = await createUser(tx);
      await asUser(tx, me, (utx) =>
        utx
          .insert(follows)
          .values({ followerId: me, followeeId: owner.id, status: "accepted" }),
      );
      expect(await statusOf(tx, me, owner.id)).toEqual([
        { status: "requested" },
      ]);
    }));

  it("não segue a si mesmo nem duas vezes", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, false);
      const me = await createUser(tx);
      await expect(
        asUser(tx, me, (utx) => follow(utx, me, me)),
      ).rejects.toEqual(pgError(CHECK_VIOLATION));
      await asUser(tx, me, (utx) => follow(utx, me, owner.id));
      await expect(
        asUser(tx, me, (utx) => follow(utx, me, owner.id)),
      ).rejects.toEqual(pgError(UNIQUE_VIOLATION));
    }));
});

describe("follows: RLS", () => {
  it("anônimo não toca na tabela", () =>
    inRollback(async (tx) => {
      await expect(
        tx.transaction(async (sp) => {
          await sp.execute(sql`set local role anon`);
          await sp.select().from(follows);
        }),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("ninguém segue em nome de outro usuário", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, false);
      const me = await createUser(tx);
      const other = await createUser(tx);
      await expect(
        asUser(tx, me, (utx) => follow(utx, other, owner.id)),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("só os dois lados enxergam a linha", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, false);
      const me = await createUser(tx);
      const stranger = await createUser(tx);
      await asUser(tx, me, (utx) => follow(utx, me, owner.id));

      expect(
        await asUser(tx, me, (utx) => utx.select().from(follows)),
      ).toHaveLength(1);
      expect(
        await asUser(tx, owner.id, (utx) => utx.select().from(follows)),
      ).toHaveLength(1);
      expect(
        await asUser(tx, stranger, (utx) => utx.select().from(follows)),
      ).toHaveLength(0);
    }));

  it("só o seguido aceita; o seguidor não se aceita", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const me = await createUser(tx);
      await asUser(tx, me, (utx) => follow(utx, me, owner.id));

      // O seguidor não tem permissão de UPDATE em nenhuma linha que não seja
      // a dele como seguido: a policy não encontra a linha e nada muda.
      const byFollower = await asUser(tx, me, (utx) =>
        utx
          .update(follows)
          .set({ status: "accepted" })
          .where(eq(follows.followerId, me))
          .returning({ status: follows.status }),
      );
      expect(byFollower).toHaveLength(0);
      expect(await statusOf(tx, me, owner.id)).toEqual([
        { status: "requested" },
      ]);

      const byOwner = await asUser(tx, owner.id, (utx) =>
        utx
          .update(follows)
          .set({ status: "accepted" })
          .where(eq(follows.followerId, me))
          .returning({ status: follows.status }),
      );
      expect(byOwner).toEqual([{ status: "accepted" }]);
    }));

  it("o seguido não troca o seguidor nem volta ao estado anterior", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const me = await createUser(tx);
      const other = await createUser(tx);
      await asUser(tx, me, (utx) => follow(utx, me, owner.id));

      await expect(
        asUser(tx, owner.id, (utx) =>
          utx
            .update(follows)
            .set({ followerId: other })
            .where(eq(follows.followerId, me)),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));

      await asUser(tx, owner.id, (utx) =>
        utx.update(follows).set({ status: "accepted" }),
      );
      await expect(
        asUser(tx, owner.id, (utx) =>
          utx.update(follows).set({ status: "requested" }),
        ),
      ).rejects.toEqual(pgError("42501"));
    }));

  it("seguidor desfaz e seguido recusa; estranho não apaga", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const me = await createUser(tx);
      const other = await createUser(tx);
      await asUser(tx, me, (utx) => follow(utx, me, owner.id));
      await asUser(tx, other, (utx) => follow(utx, other, owner.id));

      const byStranger = await asUser(tx, other, (utx) =>
        utx
          .delete(follows)
          .where(eq(follows.followerId, me))
          .returning({ id: follows.followerId }),
      );
      expect(byStranger).toHaveLength(0);

      await asUser(tx, me, (utx) =>
        utx.delete(follows).where(eq(follows.followerId, me)),
      );
      await asUser(tx, owner.id, (utx) =>
        utx.delete(follows).where(eq(follows.followerId, other)),
      );
      expect(await tx.select().from(follows)).toHaveLength(0);
    }));

  it("apagar um perfil leva os seguidores junto", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, false);
      const me = await createUser(tx);
      await asUser(tx, me, (utx) => follow(utx, me, owner.id));
      await tx.execute(sql`delete from auth.users where id = ${me}`);
      expect(await tx.select().from(follows)).toHaveLength(0);
    }));
});

describe("follows: mudança de privacidade", () => {
  it("privado vira público: as pendentes são aceitas", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const me = await createUser(tx);
      await asUser(tx, me, (utx) => follow(utx, me, owner.id));
      expect(await statusOf(tx, me, owner.id)).toEqual([
        { status: "requested" },
      ]);

      await asUser(tx, owner.id, (utx) =>
        utx
          .update(profiles)
          .set({ isPrivate: false })
          .where(eq(profiles.id, owner.id)),
      );
      expect(await statusOf(tx, me, owner.id)).toEqual([
        { status: "accepted" },
      ]);
    }));

  it("público vira privado: os seguidores aceitos continuam", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, false);
      const me = await createUser(tx);
      await asUser(tx, me, (utx) => follow(utx, me, owner.id));

      await asUser(tx, owner.id, (utx) =>
        utx
          .update(profiles)
          .set({ isPrivate: true })
          .where(eq(profiles.id, owner.id)),
      );
      expect(await statusOf(tx, me, owner.id)).toEqual([
        { status: "accepted" },
      ]);
    }));
});

describe("app.profile_card e app.profile_stats com seguidores", () => {
  it("perfil privado: quem não segue, com pedido pendente ou recusado, vê só o resumo", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const stranger = await createUser(tx);
      const pending = await createUser(tx);
      await asUser(tx, pending, (utx) => follow(utx, pending, owner.id));

      for (const viewer of [stranger, pending]) {
        const card = await asUser(tx, viewer, (utx) =>
          cardOf(utx, owner.handle),
        );
        expect(card[0]).toEqual({ bio: null, can_see_details: false });
        expect(
          await asUser(tx, viewer, (utx) => statsOf(utx, owner.id)),
        ).toHaveLength(0);
      }
    }));

  it("perfil privado: solicitação aceita vê o perfil completo", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const me = await createUser(tx);
      await asUser(tx, me, (utx) => follow(utx, me, owner.id));
      await asUser(tx, owner.id, (utx) =>
        utx.update(follows).set({ status: "accepted" }),
      );

      const card = await asUser(tx, me, (utx) => cardOf(utx, owner.handle));
      expect(card[0]).toEqual({ bio: "Minha bio", can_see_details: true });
      expect(
        await asUser(tx, me, (utx) => statsOf(utx, owner.id)),
      ).toHaveLength(1);
    }));

  it("seguir não abre o perfil privado de outra pessoa", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const friend = await createProfile(tx, false);
      const me = await createUser(tx);
      await asUser(tx, me, (utx) => follow(utx, me, friend.id));

      const card = await asUser(tx, me, (utx) => cardOf(utx, owner.handle));
      expect(card[0]).toEqual({ bio: null, can_see_details: false });
    }));

  it("perfil público: continua aberto a todos, seguindo ou não", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, false);
      const me = await createUser(tx);
      const card = await asUser(tx, me, (utx) => cardOf(utx, owner.handle));
      expect(card[0]).toEqual({ bio: "Minha bio", can_see_details: true });
      expect(
        await asUser(tx, me, (utx) => statsOf(utx, owner.id)),
      ).toHaveLength(1);
    }));

  it("o dono continua vendo o próprio perfil privado", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const card = await asUser(tx, owner.id, (utx) =>
        cardOf(utx, owner.handle),
      );
      expect(card[0]).toEqual({ bio: "Minha bio", can_see_details: true });
    }));
});
