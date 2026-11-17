import { describe, expect, it, vi } from "vitest";
import type { PeopleSearchRepository } from "./ports";
import { searchPeople } from "./search-people";

const user = { id: "00000000-0000-4000-8000-000000000001" };

function deps(people = [] as never[]) {
  const search = vi.fn<PeopleSearchRepository["search"]>(async () => people);
  return { search, deps: { people: { search } } };
}

describe("searchPeople", () => {
  it("não consulta o banco com termo curto demais", async () => {
    const { search, deps: d } = deps();
    const result = await searchPeople(d, user, { query: "  @ab " });
    expect(result).toEqual({
      ok: true,
      value: { people: [], tooShort: true },
    });
    expect(search).not.toHaveBeenCalled();
  });

  it("tira espaços e o @ inicial antes de consultar", async () => {
    const { search, deps: d } = deps();
    const result = await searchPeople(d, user, { query: "  @ renato " });
    expect(result.ok && result.value.tooShort).toBe(false);
    expect(search).toHaveBeenCalledWith("renato", { limit: 20, after: null });
  });

  it("repassa limite e cursor", async () => {
    const { search, deps: d } = deps();
    const after = { rank: 1, handle: "ana.silva" };
    await searchPeople(d, user, { query: "ana", limit: 21, after });
    expect(search).toHaveBeenCalledWith("ana", { limit: 21, after });
  });

  it("recusa entrada inválida", async () => {
    const { deps: d } = deps();
    const bad = [
      { query: 1 },
      { query: "ana", limit: 0 },
      { query: "ana", limit: 51 },
      { query: "ana", after: { rank: 9, handle: "x" } },
    ];
    for (const input of bad) {
      const result = await searchPeople(d, user, input);
      expect(result.ok).toBe(false);
    }
  });
});
