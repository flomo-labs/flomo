import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { profiles } from "./schema";

// Exercita a migration 0017: app.profile_card mostra nome, handle e foto de
// qualquer perfil a quem está logado, e a bio só a quem pode ver o perfil.
afterAll(closeTestDb);

const INSUFFICIENT_PRIVILEGE = "42501";

type Card = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
  bio: string | null;
  can_see_details: boolean;
};

function cardOf(tx: Tx, handle: string) {
  return tx.execute<Card>(sql`select * from app.profile_card(${handle})`);
}

// Perfil com handle definitivo, nome, foto e bio.
async function createProfile(tx: Tx, isPrivate: boolean) {
  const id = await createUser(tx, {
    full_name: "Pessoa de Teste",
    avatar_url: "https://exemplo.invalid/foto.png",
  });
  const handle = `t${id.replaceAll("-", "").slice(0, 12)}`;
  await tx
    .update(profiles)
    .set({ handle, bio: "Minha bio", isPrivate })
    .where(eq(profiles.id, id));
  return { id, handle };
}

describe("app.profile_card", () => {
  it("perfil público: todos os campos para outro usuário", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, false);
      const other = await createUser(tx);
      const rows = await asUser(tx, other, (utx) => cardOf(utx, owner.handle));
      expect([...rows]).toEqual([
        {
          id: owner.id,
          handle: owner.handle,
          display_name: "Pessoa de Teste",
          avatar_url: "https://exemplo.invalid/foto.png",
          is_private: false,
          bio: "Minha bio",
          can_see_details: true,
        },
      ]);
    }));

  it("perfil privado: outro usuário vê nome, handle e foto, sem bio", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const other = await createUser(tx);
      const rows = await asUser(tx, other, (utx) => cardOf(utx, owner.handle));
      expect([...rows]).toEqual([
        {
          id: owner.id,
          handle: owner.handle,
          display_name: "Pessoa de Teste",
          avatar_url: "https://exemplo.invalid/foto.png",
          is_private: true,
          bio: null,
          can_see_details: false,
        },
      ]);

      // A linha continua escondida pela policy: só o resumo chega a ela.
      const direct = await asUser(tx, other, (utx) =>
        utx
          .select({ bio: profiles.bio })
          .from(profiles)
          .where(eq(profiles.id, owner.id)),
      );
      expect(direct).toHaveLength(0);
    }));

  it("perfil privado: o dono vê tudo", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, true);
      const rows = await asUser(tx, owner.id, (utx) =>
        cardOf(utx, owner.handle),
      );
      expect(rows[0]).toMatchObject({ bio: "Minha bio", can_see_details: true });
    }));

  it("handle que não existe não responde", () =>
    inRollback(async (tx) => {
      const viewer = await createUser(tx);
      const rows = await asUser(tx, viewer, (utx) =>
        cardOf(utx, "nao.existe.nunca"),
      );
      expect(rows).toHaveLength(0);
    }));

  it("sem usuário na requisição não responde, mesmo com o papel authenticated", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, false);
      const rows = await tx.transaction(async (sp) => {
        await sp.execute(sql`set local role authenticated`);
        return cardOf(sp, owner.handle);
      });
      expect(rows).toHaveLength(0);
    }));

  it("anon não pode chamar a função", () =>
    inRollback(async (tx) => {
      const owner = await createProfile(tx, false);
      await expect(
        tx.transaction(async (sp) => {
          await sp.execute(sql`set local role anon`);
          await cardOf(sp, owner.handle);
        }),
      ).rejects.toEqual(
        expect.objectContaining({
          cause: expect.objectContaining({ code: INSUFFICIENT_PRIVILEGE }),
        }),
      );
    }));
});
