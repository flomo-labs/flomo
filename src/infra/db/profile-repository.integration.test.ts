import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { changeHandle } from "@/domain/profile/change-handle";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { createProfileRepository, findOwnProfile } from "./profile-repository";
import { profiles } from "./schema";

// Caso de uso de troca do handle de ponta a ponta: withUser + repositório +
// RLS + índice único.
afterAll(closeTestDb);

function changeHandleAs(
  tx: Parameters<typeof asUser>[0],
  userId: string,
  handle: string,
) {
  return asUser(tx, userId, (utx) =>
    changeHandle(
      { profiles: createProfileRepository(utx) },
      { id: userId },
      { handle },
    ),
  );
}

describe("changeHandle com o banco", () => {
  it("salva o handle definitivo no lugar do provisório", () =>
    inRollback(async (tx) => {
      const id = await createUser(tx);
      const handle = `t${id.slice(0, 8)}`;

      const result = await changeHandleAs(tx, id, handle);

      expect(result).toEqual({ ok: true, value: { handle } });
      const profile = await asUser(tx, id, (utx) => findOwnProfile(utx, id));
      expect(profile?.handle).toBe(handle);
    }));

  it("recusa handle de outro perfil, inclusive privado", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      const taken = `t${other.slice(0, 8)}.x`;
      await tx
        .update(profiles)
        .set({ handle: taken, isPrivate: true })
        .where(eq(profiles.id, other));

      // O perfil privado não aparece para o dono por causa do RLS; quem barra
      // é o índice único, sem abortar a transação do withUser.
      const result = await changeHandleAs(tx, owner, taken.replace(".", "_"));

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("HANDLE_TAKEN");
      const [profile] = await tx
        .select({ handle: profiles.handle })
        .from(profiles)
        .where(eq(profiles.id, owner));
      expect(profile.handle).toMatch(/^u_/);
    }));

  it("recusa handle de perfil público já na checagem prévia", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      const taken = `t${other.slice(0, 8)}`;
      await tx
        .update(profiles)
        .set({ handle: taken })
        .where(eq(profiles.id, other));

      const result = await changeHandleAs(tx, owner, taken);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("HANDLE_TAKEN");
    }));

  it("permite ao dono trocar entre variações do próprio handle", () =>
    inRollback(async (tx) => {
      const id = await createUser(tx);
      const base = `t${id.slice(0, 8)}`;
      await tx
        .update(profiles)
        .set({ handle: `${base}.a` })
        .where(eq(profiles.id, id));

      const result = await changeHandleAs(tx, id, `${base}_a`);

      expect(result).toEqual({ ok: true, value: { handle: `${base}_a` } });
    }));

  it("findOwnProfile não devolve o perfil privado de outra pessoa", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      await tx
        .update(profiles)
        .set({ isPrivate: true })
        .where(eq(profiles.id, other));

      const seen = await asUser(tx, owner, (utx) => findOwnProfile(utx, other));
      expect(seen).toBeNull();
    }));
});
