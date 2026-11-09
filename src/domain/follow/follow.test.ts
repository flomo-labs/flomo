import { describe, expect, it } from "vitest";
import {
  acceptFollowRequest,
  declineFollowRequest,
  followUser,
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
