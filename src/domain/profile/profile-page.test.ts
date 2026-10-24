import { describe, expect, it } from "vitest";
import { getProfilePage, updateProfile, watchedTime } from "./profile-page";
import type { ProfileRepository, ProfileStats, ProfileView } from "./ports";

const OWNER = "11111111-1111-4111-8111-111111111111";
const VIEWER = "22222222-2222-4222-8222-222222222222";

const ANA: ProfileView = {
  id: OWNER,
  handle: "ana.silva",
  displayName: "Ana",
  bio: null,
  avatarUrl: null,
  isPrivate: false,
  canSeeDetails: true,
};
const STATS: ProfileStats = {
  seriesCount: 2,
  moviesCount: 3,
  episodesCount: 10,
  minutesWatched: 600,
  ratingsCount: 4,
};

// Repositório em memória: `visible` imita o app.profile_card (o que existe
// para o visitante).
function fakeProfiles(visible: ProfileView[]) {
  const updates: unknown[] = [];
  const repo: ProfileRepository = {
    isHandleTaken: async () => false,
    updateHandle: async () => "updated",
    findByHandle: async (handle) =>
      visible.find((p) => p.handle === handle) ?? null,
    getStats: async (id) => (visible.some((p) => p.id === id) ? STATS : null),
    updateDetails: async (userId, details) => {
      if (userId !== OWNER) return "not_found";
      updates.push(details);
      return "updated";
    },
  };
  return { repo, updates };
}

describe("getProfilePage", () => {
  it("devolve perfil e números, com o handle da URL normalizado", async () => {
    const { repo } = fakeProfiles([ANA]);
    const result = await getProfilePage(
      { profiles: repo },
      { id: VIEWER },
      " Ana.Silva ",
    );
    expect(result).toEqual({
      ok: true,
      value: { profile: ANA, stats: STATS, isOwn: false },
    });
  });

  it("marca quando o visitante é o dono", async () => {
    const { repo } = fakeProfiles([ANA]);
    const result = await getProfilePage(
      { profiles: repo },
      { id: OWNER },
      "ana.silva",
    );
    expect(result.ok && result.value.isOwn).toBe(true);
  });

  it("aceita handle provisório", async () => {
    const provisional = { ...ANA, handle: "u_0a1b2c3d4e5f" };
    const { repo } = fakeProfiles([provisional]);
    const result = await getProfilePage(
      { profiles: repo },
      { id: VIEWER },
      "u_0a1b2c3d4e5f",
    );
    expect(result.ok).toBe(true);
  });

  it("perfil privado de outra pessoa: sem números, sem consultar a função", async () => {
    const locked = { ...ANA, isPrivate: true, canSeeDetails: false };
    const { repo } = fakeProfiles([locked]);
    let statsCalls = 0;
    const getStats = repo.getStats;
    repo.getStats = async (id) => {
      statsCalls += 1;
      return getStats(id);
    };
    const result = await getProfilePage(
      { profiles: repo },
      { id: VIEWER },
      "ana.silva",
    );
    expect(result).toEqual({
      ok: true,
      value: { profile: locked, stats: null, isOwn: false },
    });
    expect(statsCalls).toBe(0);
  });

  it("handle inexistente ou malformado dá PROFILE_NOT_FOUND", async () => {
    const { repo } = fakeProfiles([]);
    for (const handle of ["ana.silva", "../etc", "a".repeat(21), ""]) {
      const result = await getProfilePage(
        { profiles: repo },
        { id: VIEWER },
        handle,
      );
      expect(result).toEqual({
        ok: false,
        error: { code: "PROFILE_NOT_FOUND", message: "Perfil não encontrado." },
      });
    }
  });
});

describe("updateProfile", () => {
  it("valida e grava nome, bio e privacidade", async () => {
    const { repo, updates } = fakeProfiles([ANA]);
    const result = await updateProfile(
      { profiles: repo },
      { id: OWNER },
      {
        displayName: " Ana Silva ",
        bio: "",
        isPrivate: true,
      },
    );
    const expected = { displayName: "Ana Silva", bio: null, isPrivate: true };
    expect(result).toEqual({ ok: true, value: expected });
    expect(updates).toEqual([expected]);
  });

  it("devolve INVALID_INPUT sem gravar", async () => {
    const { repo, updates } = fakeProfiles([ANA]);
    const result = await updateProfile(
      { profiles: repo },
      { id: OWNER },
      {
        displayName: "n".repeat(51),
        bio: "",
        isPrivate: false,
      },
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("INVALID_INPUT");
    expect(updates).toEqual([]);
  });

  it("devolve PROFILE_NOT_FOUND quando não há perfil", async () => {
    const { repo } = fakeProfiles([ANA]);
    const result = await updateProfile(
      { profiles: repo },
      { id: VIEWER },
      {
        displayName: "",
        bio: "",
        isPrivate: false,
      },
    );
    expect(!result.ok && result.error.code).toBe("PROFILE_NOT_FOUND");
  });
});

describe("watchedTime", () => {
  it("separa horas inteiras e minutos", () => {
    expect(watchedTime(0)).toEqual({ hours: 0, minutes: 0 });
    expect(watchedTime(59)).toEqual({ hours: 0, minutes: 59 });
    expect(watchedTime(60)).toEqual({ hours: 1, minutes: 0 });
    expect(watchedTime(750)).toEqual({ hours: 12, minutes: 30 });
    expect(watchedTime(-5)).toEqual({ hours: 0, minutes: 0 });
  });
});
