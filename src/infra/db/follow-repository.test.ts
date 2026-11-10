import { describe, expect, it } from "vitest";
import type { Tx } from "./client";
import { createFollowRepository } from "./follow-repository";

// A leitura depois do insert não acha a linha (conta ou vínculo apagado no
// meio da ação): o repositório devolve not_found, não estoura erro.
function fakeTx(rows: { status: string }[]): Tx {
  const sp = {
    insert: () => ({
      values: () => ({ onConflictDoNothing: async () => undefined }),
    }),
    select: () => ({ from: () => ({ where: async () => rows }) }),
  };
  return {
    transaction: async (fn: (s: typeof sp) => unknown) => fn(sp),
  } as unknown as Tx;
}

describe("createFollowRepository.insert", () => {
  it("devolve not_found quando a linha some depois do insert", async () => {
    const repo = createFollowRepository(fakeTx([]));
    expect(await repo.insert("a", "b")).toBe("not_found");
  });

  it("devolve o estado quando a linha existe", async () => {
    const repo = createFollowRepository(fakeTx([{ status: "accepted" }]));
    expect(await repo.insert("a", "b")).toEqual({ status: "accepted" });
  });
});
