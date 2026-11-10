import { and, eq, or, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { blocks, follows, profiles } from "./schema";

// Exercita a migration 0024: tabela `blocks` (RLS), remoção do vínculo de
// seguir nos dois sentidos, recusa de novo vínculo e o que app.profile_card,
// app.profile_stats, app.follow_counts, app.followers_of e
// app.blocked_profiles passam a devolver.
afterAll(closeTestDb);

const INSUFFICIENT_PRIVILEGE = "42501";
const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

function pgError(code: string) {
  return expect.objectContaining({
    cause: expect.objectContaining({ code }),
  });
}

async function createProfile(tx: Tx, isPrivate = false) {
  const id = await createUser(tx, { full_name: "Pessoa de Teste" });
  const handle = `t${id.replaceAll("-", "").slice(0, 12)}`;
  await tx
    .update(profiles)
    .set({ handle, bio: "Minha bio", isPrivate })
    .where(eq(profiles.id, id));
  return { id, handle };
}

function block(tx: Tx, blockerId: string, blockedId: string) {
  return tx.insert(blocks).values({ blockerId, blockedId });
}

function follow(tx: Tx, followerId: string, followeeId: string) {
  return tx.insert(follows).values({ followerId, followeeId });
}

function linksBetween(tx: Tx, a: string, b: string) {
  return tx
    .select({ followerId: follows.followerId })
    .from(follows)
    .where(
      or(
        and(eq(follows.followerId, a), eq(follows.followeeId, b)),
        and(eq(follows.followerId, b), eq(follows.followeeId, a)),
      ),
    );
}

function cardOf(tx: Tx, handle: string) {
  return tx.execute<{
    handle: string;
    bio: string | null;
    can_see_details: boolean;
  }>(sql`select handle, bio, can_see_details from app.profile_card(${handle})`);
}

describe("blocks: RLS", () => {
  it("anônimo não toca na tabela", () =>
    inRollback(async (tx) => {
      await expect(
        tx.transaction(async (sp) => {
          await sp.execute(sql`set local role anon`);
          await sp.select().from(blocks);
        }),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("ninguém bloqueia em nome de outro usuário", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      const other = await createUser(tx);
      const target = await createUser(tx);
      await expect(
        asUser(tx, me, (utx) => block(utx, other, target)),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("não bloqueia a si mesmo nem duas vezes", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      const target = await createUser(tx);
      await expect(asUser(tx, me, (utx) => block(utx, me, me))).rejects.toEqual(
        pgError(CHECK_VIOLATION),
      );
      await asUser(tx, me, (utx) => block(utx, me, target));
      await expect(
        asUser(tx, me, (utx) => block(utx, me, target)),
      ).rejects.toEqual(pgError(UNIQUE_VIOLATION));
    }));

  it("só quem bloqueou enxerga a linha: bloqueado e terceiro não", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      const target = await createUser(tx);
      const stranger = await createUser(tx);
      await asUser(tx, me, (utx) => block(utx, me, target));

      expect(
        await asUser(tx, me, (utx) => utx.select().from(blocks)),
      ).toHaveLength(1);
      expect(
        await asUser(tx, target, (utx) => utx.select().from(blocks)),
      ).toHaveLength(0);
      expect(
        await asUser(tx, stranger, (utx) => utx.select().from(blocks)),
      ).toHaveLength(0);
    }));

  it("bloqueio não muda (sem UPDATE)", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      const target = await createUser(tx);
      const other = await createUser(tx);
      await asUser(tx, me, (utx) => block(utx, me, target));
      await expect(
        asUser(tx, me, (utx) => utx.update(blocks).set({ blockedId: other })),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("só quem bloqueou desfaz; bloqueado e terceiro não apagam nada", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      const target = await createUser(tx);
      const stranger = await createUser(tx);
      await asUser(tx, me, (utx) => block(utx, me, target));

      for (const intruder of [target, stranger]) {
        await asUser(tx, intruder, (utx) => utx.delete(blocks));
        expect(await tx.select().from(blocks)).toHaveLength(1);
      }
      await asUser(tx, me, (utx) => utx.delete(blocks));
      expect(await tx.select().from(blocks)).toHaveLength(0);
    }));
});

describe("blocks: vínculo de seguir", () => {
  it("ao bloquear, o vínculo some nos dois sentidos (aceito e solicitação)", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx, false);
      const them = await createProfile(tx, true);
      await asUser(tx, me.id, (utx) => follow(utx, me.id, them.id)); // requested
      await asUser(tx, them.id, (utx) => follow(utx, them.id, me.id)); // accepted
      expect(await linksBetween(tx, me.id, them.id)).toHaveLength(2);

      await asUser(tx, me.id, (utx) => block(utx, me.id, them.id));
      expect(await linksBetween(tx, me.id, them.id)).toHaveLength(0);
    }));

  it("não mexe no vínculo com terceiros", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx);
      const them = await createProfile(tx);
      const third = await createProfile(tx);
      await asUser(tx, third.id, (utx) => follow(utx, third.id, me.id));
      await asUser(tx, me.id, (utx) => follow(utx, me.id, third.id));
      await asUser(tx, me.id, (utx) => block(utx, me.id, them.id));
      expect(await linksBetween(tx, me.id, third.id)).toHaveLength(2);
    }));

  it("o bloqueado não cria novo pedido nem segue direto", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx, false);
      const priv = await createProfile(tx, true);
      const them = await createProfile(tx);
      await asUser(tx, me.id, (utx) => block(utx, me.id, them.id));
      await asUser(tx, priv.id, (utx) => block(utx, priv.id, them.id));
      await expect(
        asUser(tx, them.id, (utx) => follow(utx, them.id, me.id)),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
      await expect(
        asUser(tx, them.id, (utx) => follow(utx, them.id, priv.id)),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("quem bloqueou também não segue o bloqueado enquanto durar o bloqueio", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx);
      const them = await createProfile(tx);
      await asUser(tx, me.id, (utx) => block(utx, me.id, them.id));
      await expect(
        asUser(tx, me.id, (utx) => follow(utx, me.id, them.id)),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("desbloquear não restaura o vínculo, mas libera seguir de novo", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx);
      const them = await createProfile(tx);
      await asUser(tx, them.id, (utx) => follow(utx, them.id, me.id));
      await asUser(tx, me.id, (utx) => block(utx, me.id, them.id));
      await asUser(tx, me.id, (utx) => utx.delete(blocks));
      expect(await linksBetween(tx, me.id, them.id)).toHaveLength(0);

      await asUser(tx, them.id, (utx) => follow(utx, them.id, me.id));
      expect(await linksBetween(tx, me.id, them.id)).toHaveLength(1);
    }));
});

describe("blocks: visibilidade do perfil", () => {
  it("o bloqueado não recebe cartão, números, contagens nem listas de quem bloqueou", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx);
      const them = await createProfile(tx);
      await asUser(tx, me.id, (utx) => block(utx, me.id, them.id));

      await asUser(tx, them.id, async (utx) => {
        expect([...(await cardOf(utx, me.handle))]).toEqual([]);
        expect([
          ...(await utx.execute(
            sql`select * from app.profile_stats(${me.id}::uuid)`,
          )),
        ]).toEqual([]);
        expect([
          ...(await utx.execute(
            sql`select * from app.follow_counts(${me.id}::uuid)`,
          )),
        ]).toEqual([]);
        expect([
          ...(await utx.execute(
            sql`select * from app.followers_of(${me.id}::uuid)`,
          )),
        ]).toEqual([]);
      });
    }));

  it("quem bloqueou vê só nome e handle do bloqueado, sem bio nem detalhes", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx);
      const them = await createProfile(tx);
      await asUser(tx, me.id, (utx) => block(utx, me.id, them.id));

      await asUser(tx, me.id, async (utx) => {
        expect([...(await cardOf(utx, them.handle))]).toEqual([
          { handle: them.handle, bio: null, can_see_details: false },
        ]);
        expect([
          ...(await utx.execute(
            sql`select * from app.profile_stats(${them.id}::uuid)`,
          )),
        ]).toEqual([]);
        expect([
          ...(await utx.execute(
            sql`select * from app.follow_counts(${them.id}::uuid)`,
          )),
        ]).toEqual([]);
      });
    }));

  it("terceiro continua vendo os dois normalmente", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx);
      const them = await createProfile(tx);
      const third = await createUser(tx);
      await asUser(tx, me.id, (utx) => block(utx, me.id, them.id));

      await asUser(tx, third, async (utx) => {
        expect([...(await cardOf(utx, me.handle))]).toEqual([
          { handle: me.handle, bio: "Minha bio", can_see_details: true },
        ]);
        expect([...(await cardOf(utx, them.handle))]).toEqual([
          { handle: them.handle, bio: "Minha bio", can_see_details: true },
        ]);
      });
    }));

  it("depois de desbloquear, o bloqueado volta a ver o perfil", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx);
      const them = await createProfile(tx);
      await asUser(tx, me.id, (utx) => block(utx, me.id, them.id));
      await asUser(tx, me.id, (utx) => utx.delete(blocks));
      await asUser(tx, them.id, async (utx) => {
        expect([...(await cardOf(utx, me.handle))]).toHaveLength(1);
      });
    }));
});

describe("app.blocked_profiles", () => {
  it("lista os bloqueados com nome, handle e foto, mesmo de perfil privado", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx);
      const priv = await createProfile(tx, true);
      await asUser(tx, me.id, (utx) => block(utx, me.id, priv.id));

      const rows = await asUser(tx, me.id, (utx) =>
        utx.execute<{ profile_id: string; handle: string }>(
          sql`select profile_id, handle from app.blocked_profiles()`,
        ),
      );
      expect([...rows]).toEqual([{ profile_id: priv.id, handle: priv.handle }]);
    }));

  it("o bloqueado e terceiros recebem lista vazia; anônimo não executa", () =>
    inRollback(async (tx) => {
      const me = await createProfile(tx);
      const them = await createProfile(tx);
      const stranger = await createUser(tx);
      await asUser(tx, me.id, (utx) => block(utx, me.id, them.id));

      for (const viewer of [them.id, stranger]) {
        const rows = await asUser(tx, viewer, (utx) =>
          utx.execute(sql`select * from app.blocked_profiles()`),
        );
        expect([...rows]).toEqual([]);
      }
      await expect(
        tx.transaction(async (sp) => {
          await sp.execute(sql`set local role anon`);
          await sp.execute(sql`select * from app.blocked_profiles()`);
        }),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("funções de apoio ficam sem EXECUTE para o cliente", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      await expect(
        asUser(tx, me, (utx) =>
          utx.execute(
            sql`select app.blocked_between(${me}::uuid, ${me}::uuid)`,
          ),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));
});
