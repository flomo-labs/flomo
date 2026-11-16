import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, loadFollowList } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  loadFollowList: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/infra/db/client", () => ({ withUser: vi.fn() }));
vi.mock("@/infra/db/follow-repository", () => ({
  createFollowRepository: vi.fn(),
}));
vi.mock("../_auth/session", () => ({ getCurrentUser }));
vi.mock("./queries", () => ({ loadFollowList }));

import { loadMorePeople } from "./actions";

const input = {
  profileId: "6f1b6a52-2c1d-4a43-9d38-0f0d6f1c3a10",
  kind: "followers",
  after: {
    at: "2026-01-01T00:00:00.000000Z",
    id: "6f1b6a52-2c1d-4a43-9d38-0f0d6f1c3a11",
  },
};

describe("loadMorePeople: limite de pedidos", () => {
  beforeEach(() => {
    loadFollowList.mockReset();
    loadFollowList.mockResolvedValue({ items: [], nextCursor: null });
  });

  it("recusa com RATE_LIMITED depois do limite e não consulta a lista", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-a", claims: {} });
    const results = [];
    for (let i = 0; i < 31; i++) results.push(await loadMorePeople(input));
    expect(results.slice(0, 30).every((r) => r.ok)).toBe(true);
    const last = results[30];
    expect(last.ok).toBe(false);
    if (!last.ok) {
      expect(last.error.code).toBe("RATE_LIMITED");
      expect(last.error.message).toBe(
        "Muitas requisições. Tente de novo em instantes.",
      );
    }
    expect(loadFollowList).toHaveBeenCalledTimes(30);
  });

  it("conta por usuário: outro usuário não é afetado", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-b", claims: {} });
    const result = await loadMorePeople(input);
    expect(result.ok).toBe(true);
  });

  it("sem login devolve UNAUTHENTICATED sem gastar limite", async () => {
    getCurrentUser.mockResolvedValue(null);
    const result = await loadMorePeople(input);
    expect(!result.ok && result.error.code).toBe("UNAUTHENTICATED");
  });
});
