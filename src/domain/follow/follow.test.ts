import { describe, expect, it } from "vitest";
import {
  acceptFollowRequest,
  declineFollowRequest,
  followUser,
  getFollowCounts,
  listFollowers,
  listFollowing,
  listFollowRequests,
  unfollowUser,
} from "./follow";
import { createFakeFollows } from "./test-fakes";

const ME = { id: "11111111-1111-4111-8111-111111111111" };
const PUBLIC = "22222222-2222-4222-8222-222222222222";
const PRIVATE = "33333333-3333-4333-8333-333333333333";
const MISSING = "44444444-4444-4444-8444-444444444444";

function setup() {
  return createFakeFollows({
    profiles: [ME.id, PUBLIC, PRIVATE],
    privateIds: [PRIVATE],
  });
}

describe("followUser", () => {
  it("segue direto perfil público e pede para seguir perfil privado", async () => {
    const s = setup();
    expect(await followUser(s.deps, ME, { profileId: PUBLIC })).toEqual({
      ok: true,
      value: { status: "accepted" },
    });
    expect(await followUser(s.deps, ME, { profileId: PRIVATE })).toEqual({
      ok: true,
      value: { status: "requested" },
    });
  });

  it("seguir de novo devolve o estado atual, sem criar outra linha", async () => {
    const s = setup();
    await followUser(s.deps, ME, { profileId: PRIVATE });
    expect(await followUser(s.deps, ME, { profileId: PRIVATE })).toMatchObject({
      ok: true,
      value: { status: "requested" },
    });
    expect(s.rows).toHaveLength(1);
  });

  it("recusa seguir a si mesmo, perfil inexistente e entrada inválida", async () => {
    const s = setup();
    expect(await followUser(s.deps, ME, { profileId: ME.id })).toMatchObject({
      error: { code: "CANNOT_FOLLOW_SELF" },
    });
    expect(await followUser(s.deps, ME, { profileId: MISSING })).toMatchObject({
      error: { code: "PROFILE_NOT_FOUND" },
    });
    expect(await followUser(s.deps, ME, { profileId: "x" })).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
    expect(s.rows).toHaveLength(0);
  });
});

describe("unfollowUser", () => {
  it("deixa de seguir e cancela solicitação pendente; sem vínculo não falha", async () => {
    const s = setup();
    await followUser(s.deps, ME, { profileId: PUBLIC });
    await followUser(s.deps, ME, { profileId: PRIVATE });
    expect(await unfollowUser(s.deps, ME, { profileId: PUBLIC })).toMatchObject(
      { ok: true },
    );
    expect(
      await unfollowUser(s.deps, ME, { profileId: PRIVATE }),
    ).toMatchObject({ ok: true });
    expect(
      await unfollowUser(s.deps, ME, { profileId: PRIVATE }),
    ).toMatchObject({ ok: true });
    expect(s.rows).toHaveLength(0);
    expect(await unfollowUser(s.deps, ME, { profileId: "x" })).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
  });
});

describe("acceptFollowRequest e declineFollowRequest", () => {
  it("o dono aceita a solicitação; sem solicitação, dá erro", async () => {
    const s = setup();
    const owner = { id: PRIVATE };
    await followUser(s.deps, ME, { profileId: PRIVATE });
    expect(
      await acceptFollowRequest(s.deps, owner, { followerId: ME.id }),
    ).toMatchObject({ ok: true });
    expect(s.rows[0].status).toBe("accepted");
    expect(
      await acceptFollowRequest(s.deps, owner, { followerId: MISSING }),
    ).toMatchObject({
      error: { code: "REQUEST_NOT_FOUND" },
    });
    expect(
      await acceptFollowRequest(s.deps, owner, { followerId: "x" }),
    ).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
  });

  it("recusar apaga a solicitação e quem pediu pode pedir de novo; não remove seguidor aceito", async () => {
    const s = setup();
    const owner = { id: PRIVATE };
    await followUser(s.deps, ME, { profileId: PRIVATE });
    expect(
      await declineFollowRequest(s.deps, owner, { followerId: ME.id }),
    ).toMatchObject({ ok: true });
    expect(s.rows).toHaveLength(0);
    expect(
      await declineFollowRequest(s.deps, owner, { followerId: ME.id }),
    ).toMatchObject({ ok: true });
    await followUser(s.deps, ME, { profileId: PRIVATE });
    await acceptFollowRequest(s.deps, owner, { followerId: ME.id });
    await declineFollowRequest(s.deps, owner, { followerId: ME.id });
    expect(s.rows).toHaveLength(1);
  });
});

describe("listFollowRequests", () => {
  const A = "55555555-5555-4555-8555-555555555555";
  const B = "66666666-6666-4666-8666-666666666666";

  function world() {
    return createFakeFollows({
      profiles: [ME.id, A, B, PUBLIC],
      privateIds: [ME.id],
      people: {
        [A]: { handle: "ana", displayName: "Ana", avatarUrl: "https://x/a" },
        [B]: { handle: "beto", displayName: null, avatarUrl: null },
      },
    });
  }

  it("lista as solicitações pendentes ao dono, da mais recente para a mais antiga", async () => {
    const s = world();
    await followUser(s.deps, { id: A }, { profileId: ME.id });
    await followUser(s.deps, { id: B }, { profileId: ME.id });
    const result = await listFollowRequests(s.deps, ME);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value.requests.map((r) => r.followerId)).toEqual([B, A]);
    expect(result.value.requests[1]).toMatchObject({
      handle: "ana",
      displayName: "Ana",
      avatarUrl: "https://x/a",
    });
  });

  it("não lista quem já foi aceito nem pedidos que o dono fez a outros", async () => {
    const s = world();
    await followUser(s.deps, { id: A }, { profileId: ME.id });
    await followUser(s.deps, { id: B }, { profileId: ME.id });
    await acceptFollowRequest(s.deps, ME, { followerId: A });
    await followUser(s.deps, ME, { profileId: PUBLIC });
    const result = await listFollowRequests(s.deps, ME);
    expect(result.ok && result.value.requests.map((r) => r.followerId)).toEqual(
      [B],
    );
  });

  it("outra pessoa não vê as solicitações do dono", async () => {
    const s = world();
    await followUser(s.deps, { id: A }, { profileId: ME.id });
    const result = await listFollowRequests(s.deps, { id: B });
    expect(result).toEqual({ ok: true, value: { requests: [] } });
  });
});

describe("contagens e listas de seguidores", () => {
  const OWNER = "55555555-5555-4555-8555-555555555555";
  const F1 = "66666666-6666-4666-8666-666666666666";
  const F2 = "77777777-7777-4777-8777-777777777777";
  const STRANGER = "88888888-8888-4888-8888-888888888888";

  // Dono privado: F1 aceito, F2 pendente; o dono segue PUBLIC.
  async function build(viewerId: string) {
    const s = createFakeFollows({
      viewerId,
      profiles: [OWNER, F1, F2, STRANGER, PUBLIC],
      privateIds: [OWNER],
    });
    await followUser(s.deps, { id: F1 }, { profileId: OWNER });
    await followUser(s.deps, { id: F2 }, { profileId: OWNER });
    await acceptFollowRequest(s.deps, { id: OWNER }, { followerId: F1 });
    await followUser(s.deps, { id: OWNER }, { profileId: PUBLIC });
    return s;
  }

  it("a contagem conta só aceitos e é visível a quem não segue, mesmo em perfil privado", async () => {
    const s = await build(STRANGER);
    expect(
      await getFollowCounts(s.deps, { id: STRANGER }, { profileId: OWNER }),
    ).toEqual({
      ok: true,
      value: { followers: 1, following: 1 },
    });
  });

  it("contagem de perfil inexistente ou entrada inválida é erro", async () => {
    const s = await build(STRANGER);
    expect(
      await getFollowCounts(s.deps, { id: STRANGER }, { profileId: MISSING }),
    ).toMatchObject({
      error: { code: "PROFILE_NOT_FOUND" },
    });
    expect(
      await getFollowCounts(s.deps, { id: STRANGER }, { profileId: "x" }),
    ).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
  });

  it("o dono e o seguidor aceito veem as listas, sem pendentes", async () => {
    for (const viewer of [OWNER, F1]) {
      const s = await build(viewer);
      const followers = await listFollowers(
        s.deps,
        { id: viewer },
        { profileId: OWNER },
      );
      expect(
        followers.ok && followers.value.people.map((p) => p.profileId),
      ).toEqual([F1]);
      const following = await listFollowing(
        s.deps,
        { id: viewer },
        { profileId: OWNER },
      );
      expect(
        following.ok && following.value.people.map((p) => p.profileId),
      ).toEqual([PUBLIC]);
    }
  });

  it("em perfil privado, quem não é aceito (estranho ou pendente) recebe lista vazia", async () => {
    for (const viewer of [STRANGER, F2]) {
      const s = await build(viewer);
      expect(
        await listFollowers(s.deps, { id: viewer }, { profileId: OWNER }),
      ).toEqual({ ok: true, value: { people: [] } });
      expect(
        await listFollowing(s.deps, { id: viewer }, { profileId: OWNER }),
      ).toEqual({ ok: true, value: { people: [] } });
    }
  });

  it("em perfil público, qualquer logado vê as listas", async () => {
    const s = await build(STRANGER);
    const followers = await listFollowers(
      s.deps,
      { id: STRANGER },
      { profileId: PUBLIC },
    );
    expect(
      followers.ok && followers.value.people.map((p) => p.profileId),
    ).toEqual([OWNER]);
  });

  it("pagina e recusa página inválida", async () => {
    const s = await build(OWNER);
    await followUser(s.deps, { id: STRANGER }, { profileId: OWNER });
    await acceptFollowRequest(s.deps, { id: OWNER }, { followerId: STRANGER });
    const page = await listFollowers(
      s.deps,
      { id: OWNER },
      { profileId: OWNER, limit: 1, offset: 1 },
    );
    expect(page.ok && page.value.people.map((p) => p.profileId)).toEqual([F1]);
    expect(
      await listFollowers(
        s.deps,
        { id: OWNER },
        { profileId: OWNER, limit: 0 },
      ),
    ).toMatchObject({ error: { code: "INVALID_INPUT" } });
    expect(
      await listFollowing(
        s.deps,
        { id: OWNER },
        { profileId: OWNER, limit: 101 },
      ),
    ).toMatchObject({ error: { code: "INVALID_INPUT" } });
  });
});
