import { describe, expect, it } from "vitest";
import { blockUser, hasBlocked, listBlockedPeople, unblockUser } from "./block";
import { createFakeBlocks } from "./test-fakes";

const ME = { id: "11111111-1111-4111-8111-111111111111" };
const A = "22222222-2222-4222-8222-222222222222";
const B = "33333333-3333-4333-8333-333333333333";
const MISSING = "44444444-4444-4444-8444-444444444444";

function setup() {
  return createFakeBlocks({
    profiles: [ME.id, A, B],
    people: {
      [A]: { handle: "ana", displayName: "Ana", avatarUrl: null },
      [B]: { handle: "beto", displayName: null, avatarUrl: null },
    },
  });
}

describe("blockUser", () => {
  it("bloqueia e registra o bloqueio", async () => {
    const s = setup();
    expect(await blockUser(s.deps, ME, { profileId: A })).toEqual({
      ok: true,
      value: {},
    });
    expect(s.rows).toHaveLength(1);
  });

  it("bloquear de novo não cria outra linha nem falha", async () => {
    const s = setup();
    await blockUser(s.deps, ME, { profileId: A });
    expect((await blockUser(s.deps, ME, { profileId: A })).ok).toBe(true);
    expect(s.rows).toHaveLength(1);
  });

  it("não bloqueia a si mesmo", async () => {
    const s = setup();
    const result = await blockUser(s.deps, ME, { profileId: ME.id });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CANNOT_BLOCK_SELF");
    expect(s.rows).toHaveLength(0);
  });

  it("recusa pessoa inexistente e entrada inválida", async () => {
    const s = setup();
    const missing = await blockUser(s.deps, ME, { profileId: MISSING });
    expect(!missing.ok && missing.error.code).toBe("PROFILE_NOT_FOUND");
    const invalid = await blockUser(s.deps, ME, { profileId: "x" });
    expect(!invalid.ok && invalid.error.code).toBe("INVALID_INPUT");
  });
});

describe("unblockUser", () => {
  it("desbloqueia, e desbloquear sem bloqueio não falha", async () => {
    const s = setup();
    await blockUser(s.deps, ME, { profileId: A });
    expect((await unblockUser(s.deps, ME, { profileId: A })).ok).toBe(true);
    expect(s.rows).toHaveLength(0);
    expect((await unblockUser(s.deps, ME, { profileId: A })).ok).toBe(true);
  });

  it("recusa entrada inválida", async () => {
    const result = await unblockUser(setup().deps, ME, { profileId: 1 });
    expect(!result.ok && result.error.code).toBe("INVALID_INPUT");
  });
});

describe("listBlockedPeople e hasBlocked", () => {
  it("lista só os bloqueados de quem pergunta, do mais recente ao mais antigo", async () => {
    const s = setup();
    await blockUser(s.deps, ME, { profileId: A });
    await blockUser(s.deps, ME, { profileId: B });
    await blockUser(s.deps, { id: A }, { profileId: B });
    const result = await listBlockedPeople(s.deps, ME);
    expect(result.ok && result.value.people.map((p) => p.handle)).toEqual([
      "beto",
      "ana",
    ]);
  });

  it("diz se a pessoa está bloqueada por quem pergunta", async () => {
    const s = setup();
    await blockUser(s.deps, ME, { profileId: A });
    expect(await hasBlocked(s.deps, ME, { profileId: A })).toEqual({
      ok: true,
      value: { blocked: true },
    });
    expect(await hasBlocked(s.deps, ME, { profileId: B })).toEqual({
      ok: true,
      value: { blocked: false },
    });
  });
});
