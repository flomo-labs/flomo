import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, withUser } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  withUser: vi.fn(),
}));

vi.mock("@/infra/db/client", () => ({ withUser }));
vi.mock("@/infra/db/recent-search-repository", () => ({
  createRecentSearchRepository: vi.fn(() => ({
    list: vi.fn().mockResolvedValue([]),
    record: vi.fn().mockResolvedValue("ok"),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock("../_auth/session", () => ({ getCurrentUser }));

import {
  clearRecents,
  listRecents,
  recordRecent,
  removeRecent,
} from "./actions";

const term = { kind: "query", term: "dark" };

describe("buscas recentes: ações do servidor", () => {
  beforeEach(() => {
    withUser.mockReset();
    withUser.mockImplementation((_claims, fn) => fn({}));
  });

  it("visitante recebe UNAUTHENTICATED e o banco nem é aberto", async () => {
    getCurrentUser.mockResolvedValue(null);
    for (const result of [
      await listRecents(),
      await recordRecent(term),
      await removeRecent(term),
      await clearRecents(),
    ]) {
      expect(!result.ok && result.error.code).toBe("UNAUTHENTICATED");
    }
    expect(withUser).not.toHaveBeenCalled();
  });

  it("quem entrou lista, registra, remove e limpa", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-ok", claims: {} });
    expect(await listRecents()).toEqual({ ok: true, value: { items: [] } });
    expect(await recordRecent(term)).toMatchObject({ ok: true });
    expect(await removeRecent(term)).toMatchObject({ ok: true });
    expect(await clearRecents()).toMatchObject({ ok: true });
    expect(await recordRecent({ kind: "query", term: " " })).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
  });

  it("limita os pedidos de escrita por usuário, sem afetar outro", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-spam", claims: {} });
    const results = [];
    for (let i = 0; i < 31; i++) results.push(await recordRecent(term));
    expect(results.slice(0, 30).every((r) => r.ok)).toBe(true);
    const last = results[30];
    expect(!last.ok && last.error.code).toBe("RATE_LIMITED");
    expect(withUser).toHaveBeenCalledTimes(30);

    getCurrentUser.mockResolvedValue({ id: "user-other", claims: {} });
    expect(await recordRecent(term)).toMatchObject({ ok: true });
  });

  it("a leitura tem limite próprio", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-reader", claims: {} });
    const results = [];
    for (let i = 0; i < 61; i++) results.push(await listRecents());
    expect(results.slice(0, 60).every((r) => r.ok)).toBe(true);
    const last = results[60];
    expect(!last.ok && last.error.code).toBe("RATE_LIMITED");
  });
});
