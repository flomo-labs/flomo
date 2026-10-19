import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { changeHandle } from "@/domain/profile/change-handle";
import { getProfilePage, updateProfile } from "@/domain/profile/profile-page";
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

describe("página e edição do perfil com o banco", () => {
  it("dono edita nome, bio e privacidade; perfil privado mostra ao outro só o resumo", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      const handle = `p${owner.slice(0, 8)}`;
      await tx.update(profiles).set({ handle }).where(eq(profiles.id, owner));

      const updated = await asUser(tx, owner, (utx) =>
        updateProfile(
          { profiles: createProfileRepository(utx) },
          { id: owner },
          {
            displayName: "Ana",
            bio: "Séries coreanas.",
            isPrivate: false,
          },
        ),
      );
      expect(updated.ok).toBe(true);

      const seen = await asUser(tx, other, (utx) =>
        getProfilePage(
          { profiles: createProfileRepository(utx) },
          { id: other },
          handle,
        ),
      );
      expect(seen.ok && seen.value).toMatchObject({
        profile: {
          displayName: "Ana",
          bio: "Séries coreanas.",
          isPrivate: false,
        },
        stats: { seriesCount: 0, minutesWatched: 0 },
        isOwn: false,
      });

      await asUser(tx, owner, (utx) =>
        updateProfile(
          { profiles: createProfileRepository(utx) },
          { id: owner },
          {
            displayName: "Ana",
            bio: "Fica escondida.",
            isPrivate: true,
          },
        ),
      );
      const hidden = await asUser(tx, other, (utx) =>
        getProfilePage(
          { profiles: createProfileRepository(utx) },
          { id: other },
          handle,
        ),
      );
      expect(hidden.ok && hidden.value).toMatchObject({
        profile: {
          displayName: "Ana",
          handle,
          bio: null,
          isPrivate: true,
          canSeeDetails: false,
        },
        stats: null,
        isOwn: false,
      });

      const own = await asUser(tx, owner, (utx) =>
        getProfilePage(
          { profiles: createProfileRepository(utx) },
          { id: owner },
          handle,
        ),
      );
      expect(own.ok && own.value).toMatchObject({
        profile: { bio: "Fica escondida.", isPrivate: true, canSeeDetails: true },
        stats: { seriesCount: 0 },
        isOwn: true,
      });
    }));

  it("um usuário não altera o perfil de outro", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      const result = await asUser(tx, other, (utx) =>
        createProfileRepository(utx).updateDetails(owner, {
          displayName: "Invasor",
          bio: null,
          isPrivate: true,
        }),
      );
      expect(result).toBe("not_found");
    }));
});
