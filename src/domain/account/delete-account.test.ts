import { describe, expect, it } from "vitest";
import { deleteAccount, REAUTH_MAX_AGE_MS } from "./delete-account";
import type { AccountRepository } from "./ports";

const OWNER = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-10-22T12:00:00Z");

function fakeAccounts(existing: string[]) {
  const users = new Set(existing);
  const repo: AccountRepository = {
    async deleteUser(userId) {
      return users.delete(userId) ? "deleted" : "not_found";
    },
  };
  return { repo, users };
}

function run(repo: AccountRepository, signedInAt: Date | null) {
  return deleteAccount(
    { accounts: repo, now: () => NOW },
    { id: OWNER },
    { signedInAt },
  );
}

describe("deleteAccount", () => {
  it("apaga a conta de quem entrou há pouco", async () => {
    const { repo, users } = fakeAccounts([OWNER]);

    const result = await run(repo, new Date(NOW.getTime() - 60_000));

    expect(result).toEqual({ ok: true, value: null });
    expect(users.has(OWNER)).toBe(false);
  });

  it("aceita no limite da janela", async () => {
    const { repo, users } = fakeAccounts([OWNER]);

    const result = await run(
      repo,
      new Date(NOW.getTime() - REAUTH_MAX_AGE_MS),
    );

    expect(result.ok).toBe(true);
    expect(users.has(OWNER)).toBe(false);
  });

  it("pede para entrar de novo quando a entrada é antiga", async () => {
    const { repo, users } = fakeAccounts([OWNER]);

    const result = await run(
      repo,
      new Date(NOW.getTime() - REAUTH_MAX_AGE_MS - 1),
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "REAUTH_REQUIRED" },
    });
    expect(users.has(OWNER)).toBe(true);
  });

  it("pede para entrar de novo quando não se sabe a hora da entrada", async () => {
    const { repo, users } = fakeAccounts([OWNER]);

    const result = await run(repo, null);

    expect(result).toMatchObject({
      ok: false,
      error: { code: "REAUTH_REQUIRED" },
    });
    expect(users.has(OWNER)).toBe(true);
  });

  it("trata a conta que já não existe como excluída", async () => {
    const { repo } = fakeAccounts([]);

    const result = await run(repo, NOW);

    expect(result).toEqual({ ok: true, value: null });
  });
});
